const fs = require('fs');
const resend = require('./emailClient');

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Cervinia Travel Services <onboarding@resend.dev>';

/**
 * Emails the generated invoice PDF to the customer. Skips silently if
 * RESEND_API_KEY isn't configured or the order has no customer email on
 * file — the PDF stays downloadable from the success page either way, so
 * a missing/misconfigured email setup never blocks a booking.
 */
async function sendInvoiceEmail(order, pdfPath) {
  if (!resend) return;
  if (!order.customerEmail) {
    console.warn(`No customer email on order ${order.id} — skipping invoice email.`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: order.customerEmail,
      subject: `Your Cervinia Travel Services booking — ${order.id}`,
      html: `
        <p>Hi ${order.customerName || 'there'},</p>
        <p>Thanks for booking with Cervinia Travel Services! Your payment of €${order.total.toFixed(2)} has been received.</p>
        <p>Your invoice is attached to this email.</p>
        <p>Questions before your trip? WhatsApp us any time: <a href="https://wa.me/393668794487">+39 366 879 4487</a></p>
        <p>See you on the slopes — we don't just go there, we are there.</p>
      `,
      attachments: [
        { filename: `invoice-${order.id}.pdf`, content: fs.readFileSync(pdfPath).toString('base64') }
      ]
    });
    console.log(`✅ Invoice emailed to ${order.customerEmail} for order ${order.id}`);
  } catch (err) {
    console.error(`Could not email invoice for order ${order.id}:`, err.message);
  }
}

module.exports = { sendInvoiceEmail };
