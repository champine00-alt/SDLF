import * as crypto from 'node:crypto';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

const PAYDUNYA_MASTER_KEY = defineSecret('PAYDUNYA_MASTER_KEY');
const PAYDUNYA_PRIVATE_KEY = defineSecret('PAYDUNYA_PRIVATE_KEY');
const PAYDUNYA_TOKEN = defineSecret('PAYDUNYA_TOKEN');

const FIRESTORE_DB_ID =
  process.env.FIRESTORE_DATABASE_ID || 'ai-studio-sdl-dc35d0e8-e882-46a0-a2e3-484f1cebaddb';

const adminApp = getApps().length ? getApp() : initializeApp();
const db =
  FIRESTORE_DB_ID && FIRESTORE_DB_ID !== '(default)'
    ? getFirestore(adminApp, FIRESTORE_DB_ID)
    : getFirestore(adminApp);

type BoostPlanId = 'decouverte' | 'standard' | 'premium' | 'pro' | 'vip';

interface ServerBoostPlan {
  id: BoostPlanId;
  name: string;
  priceFCFA: number;
  durationHours: number;
  durationLabel: string;
  priority: number;
}

const SERVER_BOOST_PLANS: Record<BoostPlanId, ServerBoostPlan> = {
  decouverte: {
    id: 'decouverte',
    name: 'Découverte',
    priceFCFA: 500,
    durationHours: 24,
    durationLabel: '24 heures',
    priority: 1,
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    priceFCFA: 1000,
    durationHours: 72,
    durationLabel: '3 jours',
    priority: 2,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceFCFA: 1500,
    durationHours: 168,
    durationLabel: '7 jours',
    priority: 3,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceFCFA: 2500,
    durationHours: 360,
    durationLabel: '15 jours',
    priority: 4,
  },
  vip: {
    id: 'vip',
    name: 'VIP',
    priceFCFA: 4000,
    durationHours: 720,
    durationLabel: '30 jours',
    priority: 5,
  },
};

function getPayDunyaBaseUrl(): string {
  return (process.env.PAYDUNYA_MODE || '').toLowerCase() === 'sandbox'
    ? 'https://app.paydunya.com/sandbox-api/v1'
    : 'https://app.paydunya.com/api/v1';
}

function getPayDunyaHeaders() {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY.value().trim(),
    'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY.value().trim(),
    'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN.value().trim(),
  };
}

function verifyWebhookHash(receivedHash: unknown): boolean {
  if (typeof receivedHash !== 'string' || !receivedHash.trim()) return false;
  const expectedHex = crypto
    .createHash('sha512')
    .update(PAYDUNYA_MASTER_KEY.value().trim(), 'utf8')
    .digest('hex');
  const cleanReceived = receivedHash.trim().toLowerCase();
  if (cleanReceived.length !== expectedHex.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(cleanReceived, 'utf8'),
    Buffer.from(expectedHex, 'utf8')
  );
}

async function confirmInvoiceWithPayDunya(invoiceToken: string) {
  const response = await fetch(
    `${getPayDunyaBaseUrl()}/checkout-invoice/confirm/${encodeURIComponent(invoiceToken)}`,
    { method: 'GET', headers: getPayDunyaHeaders() }
  );
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`PayDunya confirm failed (${response.status})`);
  }
  const invoiceObj = (data.invoice as Record<string, unknown> | undefined) || {};
  const customData = (data.custom_data as Record<string, unknown> | undefined) || {};
  return {
    status: String(data.status || '').toLowerCase(),
    totalAmount: Number(invoiceObj.total_amount ?? data.total_amount ?? 0),
    receiptUrl: typeof data.receipt_url === 'string' ? data.receipt_url : '',
    customData,
    customer: (data.customer as Record<string, unknown> | undefined) || null,
  };
}

async function activateBoostInTransaction(params: {
  paymentId: string;
  paydunyaToken: string;
  verifiedAmountFCFA: number;
  receiptUrl?: string;
  customer?: Record<string, unknown> | null;
}) {
  const paymentRef = db.collection('boostPayments').doc(params.paymentId);
  return db.runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) throw new Error('PAYMENT_NOT_FOUND');

    const payment = paymentSnap.data() as Record<string, unknown>;
    const planId = String(payment.planId || '') as BoostPlanId;
    const plan = SERVER_BOOST_PLANS[planId];
    if (!plan) throw new Error('INVALID_PLAN');

    const storedAmount = Number(payment.amountFCFA || 0);
    if (params.verifiedAmountFCFA !== plan.priceFCFA || storedAmount !== plan.priceFCFA) {
      tx.update(paymentRef, {
        status: 'failed',
        failureReason: `Amount mismatch: expected ${plan.priceFCFA}, received ${params.verifiedAmountFCFA}`,
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new Error('AMOUNT_MISMATCH');
    }

    if (payment.status === 'completed' && payment.activated === true) {
      return {
        alreadyActivated: true,
        listingId: String(payment.listingId),
        plan,
        boostStartedAt: String(payment.boostStartedAt || ''),
        boostExpiresAt: String(payment.boostExpiresAt || ''),
      };
    }

    const listingId = String(payment.listingId || '');
    const listingRef = db.collection('listings').doc(listingId);
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists) throw new Error('LISTING_NOT_FOUND');

    const listingData = listingSnap.data() as Record<string, unknown>;
    const currentExpiresMs =
      typeof listingData.boostExpiresAt === 'string'
        ? Date.parse(listingData.boostExpiresAt)
        : 0;

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
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new Error('BOOST_ALREADY_ACTIVE');
    }

    const nowMs = Date.now();
    const boostStartedAt = new Date(nowMs).toISOString();
    const boostExpiresAt = new Date(
      nowMs + plan.durationHours * 60 * 60 * 1000
    ).toISOString();

    tx.update(paymentRef, {
      status: 'completed',
      activated: true,
      paydunyaToken: params.paydunyaToken,
      receiptUrl: params.receiptUrl || '',
      paydunyaCustomer: params.customer || null,
      boostStartedAt,
      boostExpiresAt,
      paidAt: FieldValue.serverTimestamp(),
      activatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(listingRef, {
      isFeatured: true,
      boostPlanId: plan.id,
      boostPlanName: plan.name,
      boostPriority: plan.priority,
      boostStartedAt,
      boostExpiresAt,
      boostPaymentId: params.paymentId,
      updatedAt: FieldValue.serverTimestamp(),
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

export const createBoostCheckout = onCall(
  {
    region: 'europe-west1',
    secrets: [PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise.');
    }

    const uid = request.auth.uid;
    const { listingId, planId, paymentMethod, returnBaseUrl, webhookUrl } = (request.data ||
      {}) as {
      listingId?: string;
      planId?: BoostPlanId;
      paymentMethod?: 'wave' | 'orange_money';
      returnBaseUrl?: string;
      webhookUrl?: string;
    };

    if (!listingId || !/^[a-zA-Z0-9_\-]+$/.test(listingId)) {
      throw new HttpsError('invalid-argument', 'Identifiant d’annonce invalide.');
    }
    const plan = planId ? SERVER_BOOST_PLANS[planId] : undefined;
    if (!plan) {
      throw new HttpsError('invalid-argument', 'Formule Boost invalide.');
    }
    if (paymentMethod !== 'wave' && paymentMethod !== 'orange_money') {
      throw new HttpsError('invalid-argument', 'Méthode de paiement invalide.');
    }

    const listingSnap = await db.collection('listings').doc(listingId).get();
    if (!listingSnap.exists) {
      throw new HttpsError('not-found', 'Annonce introuvable.');
    }
    const listingData = listingSnap.data() as Record<string, unknown>;
    if (listingData.sellerId !== uid) {
      throw new HttpsError('permission-denied', 'Vous n’êtes pas propriétaire de cette annonce.');
    }

    const expiresMs =
      typeof listingData.boostExpiresAt === 'string'
        ? Date.parse(listingData.boostExpiresAt)
        : 0;
    if (listingData.isFeatured === true && !Number.isNaN(expiresMs) && expiresMs > Date.now()) {
      throw new HttpsError('already-exists', 'Un Boost est déjà actif sur cette annonce.');
    }

    const paymentId = `boost_${crypto.randomBytes(10).toString('hex')}`;
    const channelCode = paymentMethod === 'wave' ? 'wave-senegal' : 'orange-money-senegal';
    const baseAppUrl = (returnBaseUrl || process.env.APP_BASE_URL || 'https://samadeal.sn').replace(
      /\/+$/,
      ''
    );

    const response = await fetch(`${getPayDunyaBaseUrl()}/checkout-invoice/create`, {
      method: 'POST',
      headers: getPayDunyaHeaders(),
      body: JSON.stringify({
        invoice: {
          total_amount: plan.priceFCFA,
          description: `SamaDeal Boost ${plan.name} (${plan.durationLabel}) — ${String(listingData.title || '').slice(0, 80)}`,
          channels: [channelCode],
        },
        store: {
          name: 'SamaDeal Sénégal',
          tagline: 'Marketplace d’occasion au Sénégal',
          website_url: baseAppUrl,
        },
        custom_data: {
          paymentId,
          listingId,
          sellerId: uid,
          planId: plan.id,
          expectedAmountFCFA: plan.priceFCFA,
          paymentMethod,
        },
        actions: {
          cancel_url: `${baseAppUrl}/?boost_status=cancelled&paymentId=${paymentId}`,
          return_url: `${baseAppUrl}/?boost_status=return&paymentId=${paymentId}&listingId=${listingId}`,
          callback_url:
            webhookUrl ||
            process.env.PAYDUNYA_WEBHOOK_URL ||
            `${baseAppUrl}/api/payments/paydunya-webhook`,
        },
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok || data.response_code !== '00' || !data.token || !data.response_text) {
      throw new HttpsError(
        'internal',
        typeof data.response_text === 'string'
          ? data.response_text
          : 'Erreur lors de la création de facture PayDunya.'
      );
    }

    await db.collection('boostPayments').doc(paymentId).set({
      paymentId,
      listingId,
      sellerId: uid,
      planId: plan.id,
      planName: plan.name,
      amountFCFA: plan.priceFCFA,
      durationHours: plan.durationHours,
      paymentMethod,
      provider: 'paydunya',
      paydunyaToken: String(data.token),
      checkoutUrl: String(data.response_text),
      status: 'pending',
      activated: false,
      idempotencyKey: `${uid}:${listingId}:${plan.id}:${paymentId}`,
      createdAtIso: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      paymentId,
      paydunyaToken: String(data.token),
      checkoutUrl: String(data.response_text),
      amountFCFA: plan.priceFCFA,
      plan,
    };
  }
);

export const confirmBoostPayment = onCall(
  {
    region: 'europe-west1',
    secrets: [PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise.');
    }
    const { paymentId } = (request.data || {}) as { paymentId?: string };
    if (!paymentId || !/^[a-zA-Z0-9_\-]+$/.test(paymentId)) {
      throw new HttpsError('invalid-argument', 'Identifiant de paiement invalide.');
    }

    const paymentSnap = await db.collection('boostPayments').doc(paymentId).get();
    if (!paymentSnap.exists) {
      throw new HttpsError('not-found', 'Transaction introuvable.');
    }
    const payment = paymentSnap.data() as Record<string, unknown>;
    if (payment.sellerId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Accès refusé.');
    }

    const paydunyaToken = String(payment.paydunyaToken || '');
    const verify = await confirmInvoiceWithPayDunya(paydunyaToken);
    if (verify.status !== 'completed') {
      return { confirmed: false, status: verify.status };
    }

    const activation = await activateBoostInTransaction({
      paymentId,
      paydunyaToken,
      verifiedAmountFCFA: verify.totalAmount,
      receiptUrl: verify.receiptUrl,
      customer: verify.customer,
    });

    return {
      confirmed: true,
      alreadyActivated: activation.alreadyActivated,
      listingId: activation.listingId,
      planId: activation.plan.id,
      planName: activation.plan.name,
      priority: activation.plan.priority,
      boostStartedAt: activation.boostStartedAt,
      boostExpiresAt: activation.boostExpiresAt,
    };
  }
);

export const paydunyaWebhook = onRequest(
  {
    region: 'europe-west1',
    secrets: [PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const payload = (req.body?.data || req.body || {}) as Record<string, unknown>;
      if (!verifyWebhookHash(payload.hash)) {
        res.status(403).json({ error: 'Invalid PayDunya SHA-512 hash' });
        return;
      }

      const invoiceObj = (payload.invoice as Record<string, unknown> | undefined) || {};
      const paydunyaToken = String(invoiceObj.token || payload.token || '').trim();
      if (!paydunyaToken) {
        res.status(400).json({ error: 'Missing PayDunya token' });
        return;
      }

      const verify = await confirmInvoiceWithPayDunya(paydunyaToken);
      let paymentId = String(verify.customData?.paymentId || '');
      if (!paymentId) {
        const snap = await db
          .collection('boostPayments')
          .where('paydunyaToken', '==', paydunyaToken)
          .limit(1)
          .get();
        if (snap.empty) {
          res.status(404).json({ error: 'Payment record not found' });
          return;
        }
        paymentId = snap.docs[0].id;
      }

      if (verify.status !== 'completed') {
        res.status(200).json({ received: true, status: verify.status });
        return;
      }

      const activation = await activateBoostInTransaction({
        paymentId,
        paydunyaToken,
        verifiedAmountFCFA: verify.totalAmount,
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
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal webhook error',
      });
    }
  }
);

export const expireExpiredBoosts = onSchedule(
  {
    region: 'europe-west1',
    schedule: 'every 15 minutes',
  },
  async () => {
    const nowIso = new Date().toISOString();
    const expiredSnap = await db
      .collection('listings')
      .where('isFeatured', '==', true)
      .where('boostExpiresAt', '<=', nowIso)
      .limit(200)
      .get();

    if (expiredSnap.empty) return;

    const batch = db.batch();
    for (const docSnap of expiredSnap.docs) {
      batch.update(docSnap.ref, {
        isFeatured: false,
        boostPriority: 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
);
