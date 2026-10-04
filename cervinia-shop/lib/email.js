const fs = require('fs');
const resend = require('./emailClient');

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Cervinia Travel Services <onboarding@resend.dev>';
const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || 'info@CerviniaTravelServices.com';

/**
 * Emails the generated quote PDF to the customer. Skips silently if
 * RESEND_API_KEY isn't configured or the order has no customer email on
 * file — the PDF stays downloadable from the success page either way, so
 * a missing/misconfigured email setup never blocks an enquiry.
 */
async function sendInvoiceEmail(order, pdfPath) {
  if (!resend) return;
  if (!order.customerEmail) {
    console.warn(`No customer email on order ${order.id} — skipping quote email.`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: order.customerEmail,
      subject: `Your Cervinia Travel Services quote — ${order.id}`,
      html: `
        <p>Hi ${order.customerName || 'there'},</p>
        <p>Thanks for your enquiry with Cervinia Travel Services! Here's a copy of your requested itinerary, totalling €${order.total.toFixed(2)}.</p>
        <p>This is a price estimate based on current rates — no payment has been taken. Our local team will check availability and be in touch within 24 hours to confirm everything and arrange payment.</p>
        <p>Your quote is attached to this email.</p>
        <p>Questions in the meantime? WhatsApp us any time: <a href="https://wa.me/393668794487">+39 366 879 4487</a></p>
        <p>We don't just go there, we are there.</p>
      `,
      attachments: [
        { filename: `quote-${order.id}.pdf`, content: fs.readFileSync(pdfPath).toString('base64') }
      ]
    });
    console.log(`✅ Quote emailed to ${order.customerEmail} for enquiry ${order.id}`);
  } catch (err) {
    console.error(`Could not email quote for enquiry ${order.id}:`, err.message);
  }
}

/**
 * Notifies the business of a new enquiry — customer contact details plus
 * the same itemized quote PDF, so no availability check is blind.
 */
async function sendEnquiryNotification(order, pdfPath) {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: BUSINESS_EMAIL,
      subject: `New enquiry — ${order.customerName || 'Guest'} — €${order.total.toFixed(2)}`,
      html: `
        <p>New enquiry received from the website:</p>
        <ul>
          <li><strong>Name:</strong> ${order.customerName || '—'}</li>
          <li><strong>Email:</strong> ${order.customerEmail || '—'}</li>
          <li><strong>Phone:</strong> ${order.customerPhone || '—'}</li>
          <li><strong>Reference:</strong> ${order.id}</li>
          <li><strong>Estimated total:</strong> €${order.total.toFixed(2)}</li>
        </ul>
        <p><strong>Items requested:</strong></p>
        <ul>
          ${order.items.map((item) => `<li>${item.name} × ${item.qty} — €${item.total.toFixed(2)}</li>`).join('')}
        </ul>
        <p>The full itemized quote is attached as a PDF.</p>
      `,
      attachments: [
        { filename: `quote-${order.id}.pdf`, content: fs.readFileSync(pdfPath).toString('base64') }
      ]
    });
    console.log(`✅ Enquiry notification emailed to ${BUSINESS_EMAIL} for ${order.id}`);
  } catch (err) {
    console.error(`Could not email enquiry notification for ${order.id}:`, err.message);
  }
}

/**
 * Notifies the business of a new marketing-site contact-form enquiry
 * (accommodation/custom requests — no priced basket, just free-text details).
 */
async function sendContactNotification(contact) {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: BUSINESS_EMAIL,
      subject: `New website enquiry — ${contact.name}`,
      html: `
        <p>New enquiry received from the website contact form:</p>
        <ul>
          <li><strong>Name:</strong> ${contact.name}</li>
          <li><strong>Email:</strong> ${contact.email}</li>
          <li><strong>Arrival:</strong> ${contact.arrival}</li>
          <li><strong>Departure:</strong> ${contact.departure}</li>
          <li><strong>Group size:</strong> ${contact.groupSize || '—'}</li>
          <li><strong>Services needed:</strong> ${contact.needs && contact.needs.length ? contact.needs.join(', ') : '—'}</li>
          <li><strong>Page language:</strong> ${contact.lang || 'en'}</li>
        </ul>
        <p><strong>Notes:</strong> ${contact.notes || '—'}</p>
      `
    });
    console.log(`✅ Contact-form enquiry emailed to ${BUSINESS_EMAIL} from ${contact.email}`);
  } catch (err) {
    console.error('Could not email contact-form notification:', err.message);
  }
}

/**
 * Acknowledges the customer's marketing-site enquiry immediately, so they
 * know it arrived even if the site itself gives no other confirmation.
 */
async function sendContactAcknowledgment(contact) {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: contact.email,
      subject: 'We received your enquiry — Cervinia Travel Services',
      html: `
        <p>Hi ${contact.name},</p>
        <p>Thanks for getting in touch with Cervinia Travel Services! We've received your enquiry for ${contact.arrival} to ${contact.departure} and our local team will check availability and be in touch within 24 hours (CET) with a tailored quote.</p>
        <p>Questions in the meantime? WhatsApp us any time: <a href="https://wa.me/393668794487">+39 366 879 4487</a></p>
        <p>We don't just go there, we are there.</p>
      `
    });
    console.log(`✅ Contact-form acknowledgment emailed to ${contact.email}`);
  } catch (err) {
    console.error('Could not email contact-form acknowledgment:', err.message);
  }
}

module.exports = { sendInvoiceEmail, sendEnquiryNotification, sendContactNotification, sendContactAcknowledgment };
