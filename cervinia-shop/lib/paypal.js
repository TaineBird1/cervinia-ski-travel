// PayPal.me payment link shown next to the bank-transfer details. Customers pay
// only after the team has confirmed their booking. PayPal payments carry an
// extra percentage (default 5%) that covers PayPal's fee; bank transfers are the
// exact quote total. The amount is filled in for the customer (they can still
// change it, so every payment is checked against the quote by hand). Nothing
// here talks to PayPal's API or marks an order as paid.
const HANDLE = process.env.PAYPAL_ME_HANDLE || 'CerTraSer';
const parsed = Number(process.env.PAYPAL_FEE_PERCENT);
const FEE_PERCENT = Number.isFinite(parsed) && parsed >= 0 ? parsed : 5;

// Works in whole cents so the extra amount never picks up floating-point noise.
function paypalFee(total) {
  const cents = Math.round(Number(total) * 100);
  return Math.round((cents * FEE_PERCENT) / 100) / 100;
}

function paypalAmount(total) {
  return Math.round(Number(total) * 100 + paypalFee(total) * 100) / 100;
}

// e.g. https://www.paypal.me/CerTraSer/1269.98EUR (quote total 1209.50 + 5%)
function paypalUrl(total) {
  const base = Number(total);
  if (!HANDLE || !Number.isFinite(base) || base <= 0) return null;
  return `https://www.paypal.me/${encodeURIComponent(HANDLE)}/${paypalAmount(base).toFixed(2)}EUR`;
}

module.exports = { paypalUrl, paypalAmount, paypalFee, FEE_PERCENT };
