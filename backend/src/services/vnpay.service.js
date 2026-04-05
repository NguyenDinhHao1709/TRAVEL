const crypto = require('crypto');
const querystring = require('querystring');

const vnpayMode = (process.env.VNPAY_MODE || 'sandbox').toLowerCase();

const vnpayConfig = {
  mode: vnpayMode,
  vnpayUrl: process.env.VNPAY_URL
    || (vnpayMode === 'production'
      ? 'https://pay.vnpay.vn/vpcpay.html'
      : 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  vnpayApiUrl: process.env.VNPAY_API_URL
    || (vnpayMode === 'production'
      ? 'https://pay.vnpay.vn/merchant_webapi/api/transaction'
      : 'https://sandbox.vnpayment.vn/merchant_webapi/merchant_transaction/'),
  tmnCode: process.env.VNPAY_TMN_CODE,
  secretKey: process.env.VNPAY_SECRET_KEY,
  returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5173/payment-return'
};

const isInvalidValue = (value) => {
  if (!value) {
    return true;
  }

  const normalized = String(value).trim();
  return ['MOCK', 'TMNCODE', 'SECRETKEY', 'xxx', 'your_key_here'].includes(normalized)
    || normalized.startsWith('REPLACE_');
};

const assertVNPayConfigured = () => {
  if (isInvalidValue(vnpayConfig.tmnCode) || isInvalidValue(vnpayConfig.secretKey) || !vnpayConfig.returnUrl) {
    throw new Error('VNPay chưa được cấu hình thật. Vui lòng cập nhật VNPAY_TMN_CODE, VNPAY_SECRET_KEY, VNPAY_RETURN_URL trong backend/.env');
  }
};

const generateVNPayUrl = (bookingId, amount, orderInfo) => {
  assertVNPayConfigured();

  const vnpUrl = new URL(vnpayConfig.vnpayUrl);
  const date = new Date();
  const createDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  const txnRef = `${bookingId}_${Date.now()}`;

  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: vnpayConfig.tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo || `Tour booking ${bookingId}`,
    vnp_OrderType: 'other',
    vnp_Amount: (amount * 100).toString(),
    vnp_ReturnUrl: vnpayConfig.returnUrl,
    vnp_IpAddr: '127.0.0.1',
    vnp_CreateDate: createDate
  };

  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});

  const signData = querystring.stringify(sortedParams);
  const hmac = crypto.createHmac('sha512', vnpayConfig.secretKey);
  hmac.update(signData);
  const vnpaySecureHash = hmac.digest('hex');

  sortedParams.vnp_SecureHash = vnpaySecureHash;

  const queryStr = querystring.stringify(sortedParams);
  return `${vnpayConfig.vnpayUrl}?${queryStr}`;
};

const verifyVNPayReturn = (vnpayParams) => {
  assertVNPayConfigured();

  const vnpSecureHash = vnpayParams.vnp_SecureHash;
  delete vnpayParams.vnp_SecureHash;
  delete vnpayParams.vnp_SecureHashType;

  const sortedParams = Object.keys(vnpayParams)
    .sort()
    .reduce((result, key) => {
      result[key] = vnpayParams[key];
      return result;
    }, {});

  const signData = querystring.stringify(sortedParams);
  const hmac = crypto.createHmac('sha512', vnpayConfig.secretKey);
  hmac.update(signData);
  const calculatedHash = hmac.digest('hex');

  return calculatedHash === vnpSecureHash;
};

const extractBookingIdFromTxnRef = (txnRef = '') => {
  if (!txnRef) {
    return null;
  }

  const [bookingId] = String(txnRef).split('_');
  return Number(bookingId) || null;
};

module.exports = { generateVNPayUrl, verifyVNPayReturn, extractBookingIdFromTxnRef };
