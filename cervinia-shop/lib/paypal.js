// PayPal.me payment link shown next to the bank-transfer details. Customers pay
// only after the team has confirmed their booking; the quote total is filled in
// for them (they can still change it, so every payment is checked against the
// quote by hand). Nothing here talks to PayPal's API or marks an order as paid.
const HANDLE = process.env.PAYPAL_ME_HANDLE || 'CerTraSer';

// e.g. https://www.paypal.me/CerTraSer/1209.00EUR
function paypalUrl(total) {
  const amount = Number(total);
  if (!HANDLE || !Number.isFinite(amount) || amount <= 0) return null;
  return `https://www.paypal.me/${encodeURIComponent(HANDLE)}/${amount.toFixed(2)}EUR`;
}

module.exports = { paypalUrl };
