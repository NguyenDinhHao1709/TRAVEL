const crypto = require('crypto');
const https = require('https');

const momoConfig = {
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
  returnUrl: process.env.MOMO_RETURN_URL || 'http://localhost:5173/payment-return',
  ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:5000/api/payments/momo/ipn'
};

const isInvalidValue = (value) => {
  if (!value) {
    return true;
  }

  const normalized = String(value).trim();
  return ['MOCK', 'xxx', 'your_key_here'].includes(normalized) || normalized.startsWith('REPLACE_');
};

const assertMoMoConfigured = () => {
  if (isInvalidValue(momoConfig.partnerCode) || isInvalidValue(momoConfig.accessKey) || isInvalidValue(momoConfig.secretKey)) {
    throw new Error('MoMo chưa được cấu hình thật. Vui lòng cập nhật MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY trong backend/.env');
  }
};

const signMoMoPayload = (rawSignature) => {
  const hmac = crypto.createHmac('sha256', momoConfig.secretKey);
  return hmac.update(rawSignature).digest('hex');
};

const postJson = (url, payload) => new Promise((resolve, reject) => {
  const data = JSON.stringify(payload);
  const requestUrl = new URL(url);

  const request = https.request(
    {
      hostname: requestUrl.hostname,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      method: 'POST',
      port: requestUrl.port || 443,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    },
    (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch (error) {
          reject(error);
        }
      });
    }
  );

  request.on('error', reject);
  request.write(data);
  request.end();
});

const generateMoMoPaymentUrl = async (bookingId, amount, orderInfo) => {
  assertMoMoConfigured();

  const requestId = `${bookingId}_${Date.now()}`;
  const orderId = requestId;
  const extraData = '';
  const requestType = 'captureWallet';

  const rawSignature = [
    `accessKey=${momoConfig.accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${momoConfig.ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${momoConfig.partnerCode}`,
    `redirectUrl=${momoConfig.returnUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`
  ].join('&');

  const payload = {
    partnerCode: momoConfig.partnerCode,
    accessKey: momoConfig.accessKey,
    requestId,
    amount: String(amount),
    orderId,
    orderInfo,
    redirectUrl: momoConfig.returnUrl,
    ipnUrl: momoConfig.ipnUrl,
    lang: 'vi',
    extraData,
    requestType,
    autoCapture: true,
    signature: signMoMoPayload(rawSignature)
  };

  const response = await postJson(momoConfig.endpoint, payload);

  if (!response.payUrl) {
    throw new Error(response.message || 'Không thể tạo URL thanh toán MoMo');
  }

  return { payUrl: response.payUrl, orderId, requestId };
};

const verifyMoMoReturn = (params) => {
  assertMoMoConfigured();

  const rawSignature = [
    `accessKey=${momoConfig.accessKey}`,
    `amount=${params.amount || ''}`,
    `extraData=${params.extraData || ''}`,
    `message=${params.message || ''}`,
    `orderId=${params.orderId || ''}`,
    `orderInfo=${params.orderInfo || ''}`,
    `orderType=${params.orderType || ''}`,
    `partnerCode=${params.partnerCode || ''}`,
    `payType=${params.payType || ''}`,
    `requestId=${params.requestId || ''}`,
    `responseTime=${params.responseTime || ''}`,
    `resultCode=${params.resultCode || ''}`,
    `transId=${params.transId || ''}`
  ].join('&');

  return signMoMoPayload(rawSignature) === params.signature;
};

const extractBookingIdFromOrderId = (orderId = '') => {
  const [bookingId] = String(orderId).split('_');
  return Number(bookingId) || null;
};

module.exports = {
  generateMoMoPaymentUrl,
  verifyMoMoReturn,
  extractBookingIdFromOrderId
};
