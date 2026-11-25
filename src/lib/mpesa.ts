import { env } from '../config/env.js';

type StkPushInput = {
  amount: number;
  phoneNumber: string;
  shortcode: string;
};

type StkPushResult = {
  checkoutRequestId: string;
  merchantRequestId: string;
  customerMessage: string;
};

function darajaRoot(): string | null {
  if (env.mpesaEnvironment === 'sandbox') return 'https://sandbox.safaricom.co.ke';
  if (env.mpesaEnvironment === 'production') return 'https://api.safaricom.co.ke';
  return null;
}

export function isMpesaConfigured(): boolean {
  if (
    !darajaRoot() ||
    !env.mpesaConsumerKey ||
    !env.mpesaConsumerSecret ||
    !env.mpesaPasskey ||
    !env.mpesaCallbackToken ||
    !env.mpesaCallbackUrl
  ) {
    return false;
  }

  try {
    const callback = new URL(env.mpesaCallbackUrl);
    return (
      callback.protocol === 'https:' &&
      callback.pathname === '/api/donations/mpesa/callback' &&
      callback.searchParams.get('token') === env.mpesaCallbackToken
    );
  } catch {
    return false;
  }
}

function darajaTimestamp(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}${value.month}${value.day}${value.hour}${value.minute}${value.second}`;
}

async function getAccessToken(root: string): Promise<string> {
  const credentials = Buffer.from(`${env.mpesaConsumerKey}:${env.mpesaConsumerSecret}`).toString('base64');
  const response = await fetch(`${root}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('M-Pesa could not authorize this payment request.');

  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('access_token' in payload) ||
    typeof payload.access_token !== 'string'
  ) {
    throw new Error('M-Pesa returned an invalid authorization response.');
  }
  return payload.access_token;
}

export function normalizeKenyanPhoneNumber(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  return null;
}

export async function initiateStkPush(input: StkPushInput): Promise<StkPushResult> {
  if (!isMpesaConfigured()) throw new Error('M-Pesa STK Push is not configured.');

  const root = darajaRoot();
  if (!root) throw new Error('The configured M-Pesa environment is not supported.');

  const token = await getAccessToken(root);
  const timestamp = darajaTimestamp();
  const password = Buffer.from(`${input.shortcode}${env.mpesaPasskey}${timestamp}`).toString('base64');
  const response = await fetch(`${root}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: input.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: input.amount,
      PartyA: input.phoneNumber,
      PartyB: input.shortcode,
      PhoneNumber: input.phoneNumber,
      CallBackURL: env.mpesaCallbackUrl,
      AccountReference: 'Dijitali',
      TransactionDesc: 'Donation',
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error('M-Pesa could not start this payment. Please try again.');
  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('CheckoutRequestID' in payload) ||
    typeof payload.CheckoutRequestID !== 'string' ||
    !('MerchantRequestID' in payload) ||
    typeof payload.MerchantRequestID !== 'string' ||
    !('ResponseDescription' in payload) ||
    typeof payload.ResponseDescription !== 'string'
  ) {
    throw new Error('M-Pesa returned an invalid payment response.');
  }

  return {
    checkoutRequestId: payload.CheckoutRequestID,
    merchantRequestId: payload.MerchantRequestID,
    customerMessage: payload.ResponseDescription,
  };
}
