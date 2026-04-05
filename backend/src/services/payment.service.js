const simulateExternalPayment = async (bookingId, method) => {
  const isSuccess = Math.random() > 0.2;

  return {
    bookingId,
    method,
    status: isSuccess ? 'success' : 'failed',
    transactionCode: `TXN-${Date.now()}`
  };
};

module.exports = { simulateExternalPayment };
