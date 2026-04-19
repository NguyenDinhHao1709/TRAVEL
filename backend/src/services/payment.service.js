const crypto = require('crypto');
const querystring = require('querystring');

const VNPAY_URL = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vn-pay.html';
const TMN_CODE = process.env.VNPAY_TMN_CODE || '';
const HASH_SECRET = process.env.VNPAY_HASH_SECRET || '';
const RETURN_URL = process.env.VNPAY_RETURN_URL || 'http://localhost:5173/payment-return';

function sortObject(obj) {
  const sorted = {};
  for (const key of Object.keys(obj).sort()) sorted[key] = obj[key];
  return sorted;
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

    const txnRef = `${bookingId}_${Date.now()}`;

    let params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: TMN_CODE,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${bookingId}`,
      vnp_OrderType: 'billpayment',
      vnp_Amount: String(amount * 100),
      vnp_ReturnUrl: RETURN_URL,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate
    };

    params = sortObject(params);
    // Signature must be computed on raw (non-encoded) values
    const signData = querystring.stringify(params, '&', '=', { encodeURIComponent: (v) => v });
    const hmac = crypto.createHmac('sha512', HASH_SECRET);
    params.vnp_SecureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // URL must use proper percent-encoding
    const urlParams = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    return {
      paymentUrl: `${VNPAY_URL}?${urlParams}`,
      txnRef
    };
  },

  verifyReturn: (params) => {
    const secureHash = params.vnp_SecureHash;
    const { vnp_SecureHash, vnp_SecureHashType, ...rest } = params; // eslint-disable-line no-unused-vars
    const sorted = sortObject(rest);
    const signData = querystring.stringify(sorted, '&', '=', { encodeURIComponent: (str) => str });
    const hmac = crypto.createHmac('sha512', HASH_SECRET);
    const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

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
