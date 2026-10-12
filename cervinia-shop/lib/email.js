const fs = require('fs');
const resend = require('./emailClient');
const { BANK, groupIban } = require('./bankDetails');
const i18n = require('./i18nServer');

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Cervinia Travel Services <onboarding@resend.dev>';
const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || 'info@CerviniaTravelServices.com';

// Everything a visitor types ends up in an HTML email, so it is escaped first —
// otherwise a name or note could inject links or markup into mail sent from our address.
const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const multiline = (value) => esc(value).replace(/\r?\n/g, '<br>');
const oneLine = (value) => String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').slice(0, 120);

// The Resend SDK resolves with { error } on rejected sends (bad recipient,
// unverified domain, ...) instead of throwing, so surface it to the callers' catch.
async function send(payload) {
  const { error } = await resend.emails.send(payload);
  if (error) throw new Error(`${error.name || 'resend_error'}: ${error.message}`);
}

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
    const T = i18n.get(order.lang);
    const B = T.email.quoteBody({ name: esc(order.customerName), total: require('../public/js/i18n.js').get(T.code).money(order.total) });
    const L = T.pdf.bankLabels;
    await send({
      from: FROM_EMAIL,
      to: order.customerEmail,
      subject: T.email.quoteSubject(order.id),
      html: `
        <p>${B.greeting}</p>
        <p>${B.intro}</p>
        <p>${B.estimate}</p>
        <p><strong>${B.bankIntro}</strong>${B.bankIntroRest}</p>
        <table style="border-collapse:collapse;font-size:14px;margin:0 0 14px;">
          <tr><td style="padding:3px 16px 3px 0;color:#5b6b78;">${L.accountName}</td><td style="padding:3px 0;"><strong>${BANK.accountName}</strong></td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#5b6b78;">${L.bank}</td><td style="padding:3px 0;">${BANK.bankName}, ${BANK.bankAddress}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#5b6b78;">${L.account}</td><td style="padding:3px 0;">${BANK.accountNumber}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#5b6b78;">${L.iban}</td><td style="padding:3px 0;"><strong>${groupIban(BANK.iban)}</strong></td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#5b6b78;">${L.bic}</td><td style="padding:3px 0;">${BANK.bic}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#5b6b78;">${L.reference}</td><td style="padding:3px 0;"><strong>${esc(order.id)}</strong></td></tr>
        </table>
        <p>${B.attached}</p>
        <p>${B.questions} <a href="https://wa.me/393668794487">+39 366 879 4487</a></p>
        <p>${B.tagline}</p>
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
    await send({
      from: FROM_EMAIL,
      to: BUSINESS_EMAIL,
      subject: `New enquiry — ${oneLine(order.customerName) || 'Guest'} — €${order.total.toFixed(2)}`,
      html: `
        <p>New enquiry received from the website:</p>
        <ul>
          <li><strong>Name:</strong> ${esc(order.customerName) || '—'}</li>
          <li><strong>Email:</strong> ${esc(order.customerEmail) || '—'}</li>
          <li><strong>Phone:</strong> ${esc(order.customerPhone) || '—'}</li>
          <li><strong>Reference:</strong> ${esc(order.id)}</li>
          <li><strong>Customer language:</strong> ${order.lang === 'it' ? 'Italian (quote PDF sent in Italian)' : 'English'}</li>
          <li><strong>Estimated total:</strong> €${order.total.toFixed(2)}</li>
        </ul>
        <p><strong>Items requested:</strong></p>
        <ul>
          ${order.items.map((item) => `<li>${esc(item.name)} × ${item.qty} — €${item.total.toFixed(2)}</li>`).join('')}
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
    await send({
      from: FROM_EMAIL,
      to: BUSINESS_EMAIL,
      subject: `New website enquiry — ${oneLine(contact.name)}`,
      html: `
        <p>New enquiry received from the website contact form:</p>
        <ul>
          <li><strong>Name:</strong> ${esc(contact.name)}</li>
          <li><strong>Email:</strong> ${esc(contact.email)}</li>
          <li><strong>Arrival:</strong> ${esc(contact.arrival)}</li>
          <li><strong>Departure:</strong> ${esc(contact.departure)}</li>
          <li><strong>Group size:</strong> ${esc(contact.groupSize) || '—'}</li>
          <li><strong>Services needed:</strong> ${contact.needs && contact.needs.length ? esc(contact.needs.join(', ')) : '—'}</li>
          <li><strong>Page language:</strong> ${esc(contact.lang) || 'en'}</li>
        </ul>
        <p><strong>Notes:</strong> ${multiline(contact.notes) || '—'}</p>
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
    const T = i18n.get(i18n.normalise(contact.lang));
    const A = T.email.ackBody({ name: esc(contact.name), arrival: esc(contact.arrival), departure: esc(contact.departure) });
    await send({
      from: FROM_EMAIL,
      to: contact.email,
      subject: T.email.ackSubject,
      html: `
        <p>${A.greeting}</p>
        <p>${A.body}</p>
        <p>${A.questions} <a href="https://wa.me/393668794487">+39 366 879 4487</a></p>
        <p>${A.tagline}</p>
      `
    });
    console.log(`✅ Contact-form acknowledgment emailed to ${contact.email}`);
  } catch (err) {
    console.error('Could not email contact-form acknowledgment:', err.message);
  }
}

module.exports = { esc, sendInvoiceEmail, sendEnquiryNotification, sendContactNotification, sendContactAcknowledgment };
