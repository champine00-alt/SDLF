import crypto from 'node:crypto';
import type { BoostPaymentMethod, BoostPlan } from '../types/index.ts';

export interface PayDunyaConfig {
  masterKey: string;
  privateKey: string;
  token: string;
  mode: 'live' | 'sandbox';
  baseUrl: string;
}

export function getPayDunyaConfig(): PayDunyaConfig | null {
  const masterKey = (process.env.PAYDUNYA_MASTER_KEY || '').trim();
  const privateKey = (process.env.PAYDUNYA_PRIVATE_KEY || '').trim();
  const token = (process.env.PAYDUNYA_TOKEN || '').trim();

  if (!masterKey || !privateKey || !token) {
    return null;
  }

  const mode =
    (process.env.PAYDUNYA_MODE || '').toLowerCase() === 'sandbox' ? 'sandbox' : 'live';
  const baseUrl =
    mode === 'sandbox'
      ? 'https://app.paydunya.com/sandbox-api/v1'
      : 'https://app.paydunya.com/api/v1';

  return { masterKey, privateKey, token, mode, baseUrl };
}

export function isPayDunyaConfigured(): boolean {
  return getPayDunyaConfig() !== null;
}

function buildHeaders(config: PayDunyaConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': config.masterKey,
    'PAYDUNYA-PRIVATE-KEY': config.privateKey,
    'PAYDUNYA-TOKEN': config.token,
  };
}

export interface CreatePayDunyaInvoiceParams {
  paymentId: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerEmail?: string;
  plan: BoostPlan;
  paymentMethod: BoostPaymentMethod;
  baseUrl: string;
}

export interface PayDunyaCreateResult {
  paydunyaToken: string;
  checkoutUrl: string;
  raw: Record<string, unknown>;
}

export async function createPayDunyaCheckoutInvoice(
  params: CreatePayDunyaInvoiceParams
): Promise<PayDunyaCreateResult> {
  const config = getPayDunyaConfig();
  if (!config) {
    throw new Error(
      'PayDunya non configuré sur le serveur (PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN requis).'
    );
  }

  const channelCode =
    params.paymentMethod === 'wave' ? 'wave-senegal' : 'orange-money-senegal';

  const cleanBaseUrl = params.baseUrl.replace(/\/+$/, '');
  const payload = {
    invoice: {
      total_amount: params.plan.priceFCFA,
      description: `SamaDeal Boost ${params.plan.name} (${params.plan.durationLabel}) — ${params.listingTitle.slice(0, 80)}`,
      channels: [channelCode],
    },
    store: {
      name: 'SamaDeal Sénégal',
      tagline: 'Marketplace d’occasion au Sénégal',
      website_url: cleanBaseUrl,
    },
    custom_data: {
      paymentId: params.paymentId,
      listingId: params.listingId,
      sellerId: params.sellerId,
      sellerEmail: params.sellerEmail || '',
      planId: params.plan.id,
      planName: params.plan.name,
      expectedAmountFCFA: params.plan.priceFCFA,
      durationHours: params.plan.durationHours,
      paymentMethod: params.paymentMethod,
    },
    actions: {
      cancel_url: `${cleanBaseUrl}/?boost_status=cancelled&paymentId=${encodeURIComponent(params.paymentId)}`,
      return_url: `${cleanBaseUrl}/?boost_status=return&paymentId=${encodeURIComponent(params.paymentId)}&listingId=${encodeURIComponent(params.listingId)}`,
      callback_url: `${cleanBaseUrl}/api/payments/paydunya-webhook`,
    },
  };

  const response = await fetch(`${config.baseUrl}/checkout-invoice/create`, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok || data.response_code !== '00') {
    const reason =
      typeof data.response_text === 'string' && data.response_text
        ? data.response_text
        : `Erreur PayDunya (${response.status})`;
    throw new Error(reason);
  }

  const paydunyaToken = typeof data.token === 'string' ? data.token : '';
  const checkoutUrl =
    typeof data.response_text === 'string' ? data.response_text : '';

  if (!paydunyaToken || !checkoutUrl) {
    throw new Error('Réponse PayDunya incomplète : token ou URL de paiement manquant.');
  }

  return { paydunyaToken, checkoutUrl, raw: data };
}

export interface PayDunyaConfirmResult {
  responseCode: string;
  status: string;
  totalAmount: number;
  receiptUrl?: string;
  customData: Record<string, unknown>;
  customer?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export async function confirmPayDunyaInvoice(
  invoiceToken: string
): Promise<PayDunyaConfirmResult> {
  const config = getPayDunyaConfig();
  if (!config) {
    throw new Error('PayDunya non configuré sur le serveur.');
  }

  const cleanToken = invoiceToken.trim();
  if (!cleanToken) {
    throw new Error('Token de facture PayDunya manquant.');
  }

  const response = await fetch(
    `${config.baseUrl}/checkout-invoice/confirm/${encodeURIComponent(cleanToken)}`,
    {
      method: 'GET',
      headers: buildHeaders(config),
    }
  );

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Impossible de confirmer la facture PayDunya (${response.status}).`);
  }

  const invoiceObj = (data.invoice as Record<string, unknown> | undefined) || {};
  const customData = (data.custom_data as Record<string, unknown> | undefined) || {};
  const totalAmount = Number(invoiceObj.total_amount ?? data.total_amount ?? 0);

  return {
    responseCode: String(data.response_code || ''),
    status: String(data.status || '').toLowerCase(),
    totalAmount,
    receiptUrl: typeof data.receipt_url === 'string' ? data.receipt_url : undefined,
    customData,
    customer: (data.customer as Record<string, unknown> | undefined) || undefined,
    raw: data,
  };
}

export function verifyPayDunyaWebhookHash(receivedHash: unknown): boolean {
  const config = getPayDunyaConfig();
  if (!config || typeof receivedHash !== 'string' || !receivedHash.trim()) {
    return false;
  }

  const expectedHex = crypto
    .createHash('sha512')
    .update(config.masterKey, 'utf8')
    .digest('hex');

  const receivedClean = receivedHash.trim().toLowerCase();
  if (receivedClean.length !== expectedHex.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(receivedClean, 'utf8'),
    Buffer.from(expectedHex, 'utf8')
  );
}
