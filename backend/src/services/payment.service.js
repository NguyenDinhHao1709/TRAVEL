const crypto = require('crypto');

const VNPAY_URL = (process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html').trim();
const TMN_CODE = (process.env.VNPAY_TMN_CODE || '').trim();
const HASH_SECRET = (process.env.VNPAY_HASH_SECRET || '').trim();
const RETURN_URL = (process.env.VNPAY_RETURN_URL || 'http://localhost:5173/payment-return').trim();

// Log config on load
console.log('[VNPay] TMN_CODE:', TMN_CODE, '| SECRET:', HASH_SECRET, '| URL:', VNPAY_URL);

// PHP-compatible urlencode: encodeURIComponent + space→+
function vnpEncode(str) {
  return encodeURIComponent(String(str)).replace(/%20/g, '+');
}

module.exports = {
  createPaymentUrl: (bookingId, amount, orderInfo, ipAddr) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const createDate =
      now.getFullYear() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    const expire = new Date(now.getTime() + 15 * 60 * 1000);
    const expireDate =
      expire.getFullYear() +
      pad(expire.getMonth() + 1) +
      pad(expire.getDate()) +
      pad(expire.getHours()) +
      pad(expire.getMinutes()) +
      pad(expire.getSeconds());

    const txnRef = `${bookingId}_${Date.now()}`;

    // Remove Vietnamese diacritics and special chars
    const safeOrderInfo = (orderInfo || `Thanh toan don hang ${bookingId}`)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9 ]/g, '');

    // Build params object (raw, unencoded values)
    const params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: TMN_CODE,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: safeOrderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(amount * 100)),
      vnp_ReturnUrl: RETURN_URL,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    // Sort keys alphabetically, build encoded query parts (matching PHP urlencode exactly)
    const sortedKeys = Object.keys(params).sort();
    const encodedParts = sortedKeys.map(key => vnpEncode(key) + '=' + vnpEncode(params[key]));
    const signData = encodedParts.join('&');

    // HMAC-SHA512 (default for VNPay)
    const signed = crypto.createHmac('sha512', HASH_SECRET)
      .update(Buffer.from(signData, 'utf-8')).digest('hex');

    const paymentUrl = VNPAY_URL + '?' + signData + '&vnp_SecureHash=' + signed;

    // Debug
    console.log('[VNPay] signData:', signData);
    console.log('[VNPay] hash512:', signed);
    console.log('[VNPay] paymentUrl:', paymentUrl);

    return { paymentUrl, txnRef };
  },

  verifyReturn: (params) => {
    const secureHash = params.vnp_SecureHash;
    const copyParams = { ...params };
    delete copyParams.vnp_SecureHash;
    delete copyParams.vnp_SecureHashType;

    const sortedKeys = Object.keys(copyParams).sort();
    const encodedParts = sortedKeys.map(key => vnpEncode(key) + '=' + vnpEncode(copyParams[key]));
    const signData = encodedParts.join('&');

    const checkHash = crypto.createHmac('sha512', HASH_SECRET)
      .update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (!HASH_SECRET || checkHash !== secureHash) {
      return { valid: false, responseCode: '97' };
    }

    return {
      valid: true,
      responseCode: params.vnp_ResponseCode,
      txnRef: params.vnp_TxnRef,
      amount: Math.floor(Number(params.vnp_Amount) / 100),
      transactionNo: params.vnp_TransactionNo,
      bankCode: params.vnp_BankCode
    };
  },

  isConfigured: () => !!(TMN_CODE && HASH_SECRET)
};
