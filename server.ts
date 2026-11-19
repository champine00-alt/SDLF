import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from './src/middleware/auth.ts';
import type { AuthRequest } from './src/middleware/auth.ts';
import { adminDb, adminFieldValue } from './src/lib/firebase-admin.ts';
import {
  BOOST_PLANS,
  getBoostPlan,
  isValidBoostPlanId,
} from './src/lib/boostPlans.ts';
import {
  confirmPayDunyaInvoice,
  createPayDunyaCheckoutInvoice,
  isPayDunyaConfigured,
  verifyPayDunyaWebhookHash,
} from './src/lib/paydunya.ts';
import type { BoostPaymentMethod } from './src/types/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveBaseUrl(req: Request): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto =
    typeof forwardedProto === 'string'
      ? forwardedProto.split(',')[0].trim()
      : req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function isValidFirestoreDocId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length >= 1 &&
    id.length <= 128 &&
    /^[a-zA-Z0-9_\-]+$/.test(id)
  );
}

function isPermissionDeniedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('PERMISSION_DENIED') || msg.includes('7 PERMISSION_DENIED');
}

async function activateBoostAtomically(params: {
  paymentId: string;
  paydunyaToken: string;
  expectedAmountFCFA: number;
  receiptUrl?: string;
  customer?: Record<string, unknown>;
}) {
  const paymentRef = adminDb.collection('boostPayments').doc(params.paymentId);

  return adminDb.runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    const payment = paymentSnap.data() as Record<string, unknown>;
    const listingId = String(payment.listingId || '');
    const planId = payment.planId;
    const storedAmount = Number(payment.amountFCFA || 0);

    if (!isValidBoostPlanId(planId)) {
      throw new Error('INVALID_PLAN');
    }

    const plan = getBoostPlan(planId);
    if (params.expectedAmountFCFA !== plan.priceFCFA || storedAmount !== plan.priceFCFA) {
      tx.update(paymentRef, {
        status: 'failed',
        failureReason: `Amount mismatch: expected ${plan.priceFCFA}, received ${params.expectedAmountFCFA}`,
        updatedAt: adminFieldValue.serverTimestamp(),
      });
      throw new Error('AMOUNT_MISMATCH');
    }

    // Idempotent guard: already completed and activated
    if (payment.status === 'completed' && payment.activated === true) {
      return {
        alreadyActivated: true,
        listingId,
        plan,
        boostStartedAt: payment.boostStartedAt,
        boostExpiresAt: payment.boostExpiresAt,
      };
    }

    const listingRef = adminDb.collection('listings').doc(listingId);
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists) {
      throw new Error('LISTING_NOT_FOUND');
    }

    const listingData = listingSnap.data() as Record<string, unknown>;
    const currentExpiresStr =
      typeof listingData.boostExpiresAt === 'string' ? listingData.boostExpiresAt : '';
    const currentExpiresMs = currentExpiresStr ? Date.parse(currentExpiresStr) : 0;

    // Prevent double activation on same listing from a different payment while a boost is active
    if (
      listingData.isFeatured === true &&
      !Number.isNaN(currentExpiresMs) &&
      currentExpiresMs > Date.now() &&
      listingData.boostPaymentId !== params.paymentId
    ) {
      tx.update(paymentRef, {
        status: 'duplicate_rejected',
        activated: false,
        failureReason: 'Un Boost est déjà actif sur cette annonce.',
        updatedAt: adminFieldValue.serverTimestamp(),
      });
      throw new Error('BOOST_ALREADY_ACTIVE');
    }

    const nowMs = Date.now();
    const expiresMs = nowMs + plan.durationHours * 60 * 60 * 1000;
    const boostStartedAt = new Date(nowMs).toISOString();
    const boostExpiresAt = new Date(expiresMs).toISOString();

    tx.update(paymentRef, {
      status: 'completed',
      activated: true,
      paydunyaToken: params.paydunyaToken,
      receiptUrl: params.receiptUrl || payment.receiptUrl || '',
      paydunyaCustomer: params.customer || null,
      boostStartedAt,
      boostExpiresAt,
      paidAt: adminFieldValue.serverTimestamp(),
      activatedAt: adminFieldValue.serverTimestamp(),
      updatedAt: adminFieldValue.serverTimestamp(),
    });

    tx.update(listingRef, {
      isFeatured: true,
      boostPlanId: plan.id,
      boostPlanName: plan.name,
      boostPriority: plan.priority,
      boostStartedAt,
      boostExpiresAt,
      boostPaymentId: params.paymentId,
      updatedAt: adminFieldValue.serverTimestamp(),
    });

    return {
      alreadyActivated: false,
      listingId,
      plan,
      boostStartedAt,
      boostExpiresAt,
    };
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      paydunyaConfigured: isPayDunyaConfigured(),
      time: new Date().toISOString(),
    });
  });

  app.post('/api/sync-user', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      if (!process.env.SQL_HOST) {
        res.json({ success: true, mode: 'firebase-only' });
        return;
      }
      const { getOrCreateUser } = await import('./src/db/users.ts');
      const { uid, email } = req.user!;
      const user = await getOrCreateUser(uid, email || '');
      res.json({ success: true, user });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sync user';
      console.error('Error syncing user:', error);
      res.status(500).json({ error: message });
    }
  });

  // Authoritative 5-tier Boost catalog
  app.get('/api/boost/plans', (_req: Request, res: Response) => {
    res.json({
      plans: BOOST_PLANS,
      paydunyaConfigured: isPayDunyaConfigured(),
    });
  });

  // Create real PayDunya Checkout Invoice (authenticated seller, server-side price & anti-double-payment)
  app.post('/api/boost/create-checkout', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      if (!isPayDunyaConfigured()) {
        res.status(503).json({
          error:
            'Passerelle PayDunya non configurée. Définissez PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY et PAYDUNYA_TOKEN côté serveur.',
          code: 'PAYDUNYA_NOT_CONFIGURED',
        });
        return;
      }

      const uid = req.user!.uid;
      const email = req.user!.email || '';
      const { listingId, planId, paymentMethod } = req.body as {
        listingId?: unknown;
        planId?: unknown;
        paymentMethod?: unknown;
      };

      if (!isValidFirestoreDocId(listingId)) {
        res.status(400).json({ error: 'Identifiant d’annonce invalide.' });
        return;
      }
      if (!isValidBoostPlanId(planId)) {
        res.status(400).json({ error: 'Formule Boost invalide.' });
        return;
      }
      if (paymentMethod !== 'wave' && paymentMethod !== 'orange_money') {
        res.status(400).json({ error: 'Méthode de paiement invalide (Wave ou Orange Money).' });
        return;
      }

      const plan = getBoostPlan(planId);
      const listingRef = adminDb.collection('listings').doc(listingId);
      const listingSnap = await listingRef.get();

      if (!listingSnap.exists) {
        res.status(404).json({
          error: 'Annonce introuvable dans Firestore. Veuillez réessayer après synchronisation.',
        });
        return;
      }

      const listingData = listingSnap.data() as Record<string, unknown>;
      if (listingData.sellerId !== uid) {
        res.status(403).json({
          error: 'Accès refusé : vous ne pouvez booster que vos propres annonces.',
        });
        return;
      }

      // Check active non-expired boost
      const currentExpiresStr =
        typeof listingData.boostExpiresAt === 'string' ? listingData.boostExpiresAt : '';
      const currentExpiresMs = currentExpiresStr ? Date.parse(currentExpiresStr) : 0;
      if (
        listingData.isFeatured === true &&
        !Number.isNaN(currentExpiresMs) &&
        currentExpiresMs > Date.now()
      ) {
        res.status(409).json({
          error: 'Cette annonce bénéficie déjà d’un Boost actif. Attendez son expiration pour éviter un double paiement.',
          code: 'BOOST_ALREADY_ACTIVE',
        });
        return;
      }

      // Idempotency check: prevent rapid duplicate invoice creation for the same listing & plan
      const existingPendingSnap = await adminDb
        .collection('boostPayments')
        .where('listingId', '==', listingId)
        .where('sellerId', '==', uid)
        .where('status', '==', 'pending')
        .limit(5)
        .get();

      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      for (const docSnap of existingPendingSnap.docs) {
        const p = docSnap.data() as Record<string, unknown>;
        const createdIso = typeof p.createdAtIso === 'string' ? Date.parse(p.createdAtIso) : 0;
        if (
          p.planId === plan.id &&
          p.paymentMethod === paymentMethod &&
          p.checkoutUrl &&
          createdIso > fiveMinutesAgo
        ) {
          res.json({
            paymentId: docSnap.id,
            paydunyaToken: p.paydunyaToken,
            checkoutUrl: p.checkoutUrl,
            amountFCFA: plan.priceFCFA,
            plan,
            reusedPending: true,
          });
          return;
        }
      }

      const paymentId = `boost_${crypto.randomBytes(10).toString('hex')}`;
      const idempotencyKey = `${uid}:${listingId}:${plan.id}:${paymentId}`;
      const listingTitle = String(listingData.title || 'Annonce SamaDeal');

      const invoice = await createPayDunyaCheckoutInvoice({
        paymentId,
        listingId,
        listingTitle,
        sellerId: uid,
        sellerEmail: email,
        plan,
        paymentMethod: paymentMethod as BoostPaymentMethod,
        baseUrl: resolveBaseUrl(req),
      });

      const nowIso = new Date().toISOString();
      await adminDb.collection('boostPayments').doc(paymentId).set({
        paymentId,
        listingId,
        sellerId: uid,
        planId: plan.id,
        planName: plan.name,
        amountFCFA: plan.priceFCFA,
        durationHours: plan.durationHours,
        paymentMethod,
        provider: 'paydunya',
        paydunyaToken: invoice.paydunyaToken,
        checkoutUrl: invoice.checkoutUrl,
        status: 'pending',
        activated: false,
        idempotencyKey,
        createdAtIso: nowIso,
        createdAt: adminFieldValue.serverTimestamp(),
        updatedAt: adminFieldValue.serverTimestamp(),
      });

      res.json({
        paymentId,
        paydunyaToken: invoice.paydunyaToken,
        checkoutUrl: invoice.checkoutUrl,
        amountFCFA: plan.priceFCFA,
        plan,
      });
    } catch (error: unknown) {
      console.error('Create Boost Checkout Error:', error);
      if (isPermissionDeniedError(error)) {
        res.status(403).json({
          error:
            'Accès Firestore Admin refusé (PERMISSION_DENIED). Attribuez roles/datastore.user au compte de service ou déployez les Cloud Functions Firebase.',
          code: 'FIRESTORE_IAM_REQUIRED',
        });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Erreur lors de la création du paiement PayDunya.';
      res.status(500).json({ error: message });
    }
  });

  // Official PayDunya confirmation check (called after customer returns from PayDunya)
  app.post('/api/boost/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      if (!isPayDunyaConfigured()) {
        res.status(503).json({ error: 'PayDunya non configuré sur le serveur.' });
        return;
      }

      const uid = req.user!.uid;
      const { paymentId } = req.body as { paymentId?: unknown };
      if (!isValidFirestoreDocId(paymentId)) {
        res.status(400).json({ error: 'Identifiant de paiement invalide.' });
        return;
      }

      const paymentSnap = await adminDb.collection('boostPayments').doc(paymentId).get();
      if (!paymentSnap.exists) {
        res.status(404).json({ error: 'Transaction Boost introuvable.' });
        return;
      }

      const payment = paymentSnap.data() as Record<string, unknown>;
      if (payment.sellerId !== uid) {
        res.status(403).json({ error: 'Accès non autorisé à cette transaction.' });
        return;
      }

      if (payment.status === 'completed' && payment.activated === true) {
        res.json({
          confirmed: true,
          alreadyActivated: true,
          listingId: payment.listingId,
          planId: payment.planId,
          boostStartedAt: payment.boostStartedAt,
          boostExpiresAt: payment.boostExpiresAt,
        });
        return;
      }

      const paydunyaToken = String(payment.paydunyaToken || '');
      if (!paydunyaToken) {
        res.status(400).json({ error: 'Token PayDunya introuvable pour cette transaction.' });
        return;
      }

      const verify = await confirmPayDunyaInvoice(paydunyaToken);
      if (verify.status !== 'completed') {
        if (verify.status === 'cancelled' || verify.status === 'failed') {
          await adminDb.collection('boostPayments').doc(paymentId).update({
            status: verify.status,
            updatedAt: adminFieldValue.serverTimestamp(),
          });
        }
        res.json({
          confirmed: false,
          status: verify.status || 'pending',
          message: 'Paiement encore en attente de confirmation officielle PayDunya.',
        });
        return;
      }

      const activation = await activateBoostAtomically({
        paymentId,
        paydunyaToken,
        expectedAmountFCFA: verify.totalAmount,
        receiptUrl: verify.receiptUrl,
        customer: verify.customer,
      });

      res.json({
        confirmed: true,
        alreadyActivated: activation.alreadyActivated,
        listingId: activation.listingId,
        planId: activation.plan.id,
        planName: activation.plan.name,
        priority: activation.plan.priority,
        boostStartedAt: activation.boostStartedAt,
        boostExpiresAt: activation.boostExpiresAt,
      });
    } catch (error: unknown) {
      console.error('Confirm Boost Error:', error);
      const message = error instanceof Error ? error.message : 'Erreur de confirmation PayDunya.';
      if (message === 'BOOST_ALREADY_ACTIVE') {
        res.status(409).json({ error: 'Cette annonce possède déjà un Boost actif.' });
        return;
      }
      if (message === 'AMOUNT_MISMATCH') {
        res.status(400).json({ error: 'Montant PayDunya non conforme à la formule sélectionnée.' });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  // Official PayDunya IPN Webhook (POST)
  app.post('/api/payments/paydunya-webhook', async (req: Request, res: Response) => {
    try {
      const payload = (req.body?.data || req.body || {}) as Record<string, unknown>;
      const receivedHash = payload.hash;

      if (!verifyPayDunyaWebhookHash(receivedHash)) {
        res.status(403).json({ error: 'Signature webhook PayDunya invalide.' });
        return;
      }

      const invoiceObj = (payload.invoice as Record<string, unknown> | undefined) || {};
      const paydunyaToken = String(invoiceObj.token || payload.token || '').trim();
      if (!paydunyaToken) {
        res.status(400).json({ error: 'Token PayDunya absent du webhook.' });
        return;
      }

      // Server-to-server authoritative verification against PayDunya API
      const verify = await confirmPayDunyaInvoice(paydunyaToken);
      const customPaymentId = String(verify.customData?.paymentId || '');

      let paymentId = customPaymentId;
      if (!isValidFirestoreDocId(paymentId)) {
        const snap = await adminDb
          .collection('boostPayments')
          .where('paydunyaToken', '==', paydunyaToken)
          .limit(1)
          .get();
        if (snap.empty) {
          res.status(404).json({ error: 'Transaction correspondante introuvable.' });
          return;
        }
        paymentId = snap.docs[0].id;
      }

      if (verify.status !== 'completed') {
        if (verify.status === 'cancelled' || verify.status === 'failed') {
          await adminDb.collection('boostPayments').doc(paymentId).update({
            status: verify.status,
            updatedAt: adminFieldValue.serverTimestamp(),
          });
        }
        res.status(200).json({ received: true, status: verify.status });
        return;
      }

      const activation = await activateBoostAtomically({
        paymentId,
        paydunyaToken,
        expectedAmountFCFA: verify.totalAmount,
        receiptUrl: verify.receiptUrl,
        customer: verify.customer,
      });

      res.status(200).json({
        received: true,
        activated: true,
        alreadyActivated: activation.alreadyActivated,
        paymentId,
        listingId: activation.listingId,
      });
    } catch (error: unknown) {
      console.error('PayDunya Webhook Error:', error);
      const msg = error instanceof Error ? error.message : 'Erreur webhook';
      if (msg === 'BOOST_ALREADY_ACTIVE' || msg === 'AMOUNT_MISMATCH') {
        res.status(200).json({ received: true, rejected: msg });
        return;
      }
      res.status(500).json({ error: msg });
    }
  });

  const distDir = path.resolve(__dirname, 'dist');
  const distIndexPath = path.join(distDir, 'index.html');
  const isTsxRuntime =
    process.env.npm_lifecycle_event === 'dev' ||
    process.execArgv.some((arg) => arg.includes('tsx'));
  const isProductionMode =
    process.env.NODE_ENV === 'production' || !isTsxRuntime;

  if (isProductionMode) {
    if (!fs.existsSync(distIndexPath)) {
      console.log('dist/index.html missing in production, building frontend bundle...');
      const { build } = await import('vite');
      await build();
    }
    app.use(express.static(distDir, { maxAge: '1d' }));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
      }
      if (path.extname(req.path)) {
        return res.status(404).end();
      }
      return res.sendFile(distIndexPath);
    });
  } else {
    // Development: dynamically load Vite middleware so production avoids Vite dev overhead
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const cliPortArgIndex = process.argv.findIndex(
    (arg) => arg === '--port' || arg.startsWith('--port=')
  );
  let cliPort: number | undefined;
  if (cliPortArgIndex !== -1) {
    const rawArg = process.argv[cliPortArgIndex];
    const val = rawArg.includes('=')
      ? rawArg.split('=')[1]
      : process.argv[cliPortArgIndex + 1];
    const parsed = val ? parseInt(val, 10) : NaN;
    if (!Number.isNaN(parsed) && parsed > 0) {
      cliPort = parsed;
    }
  }
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
  const port = cliPort ?? (!Number.isNaN(envPort) && envPort > 0 ? envPort : 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
