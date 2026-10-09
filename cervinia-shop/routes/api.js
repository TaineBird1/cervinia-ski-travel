const express = require('express');
const fs = require('fs');
const path = require('path');

const orderStore = require('../lib/orderStore');
const contactStore = require('../lib/contactStore');
const { invoicePath, generateInvoicePDF } = require('../lib/invoice');
const { sendInvoiceEmail, sendEnquiryNotification, sendContactNotification, sendContactAcknowledgment } = require('../lib/email');
const { BANK, groupIban } = require('../lib/bankDetails');
const { priceBasket, BasketError, cleanText } = require('../lib/priceCheck');
const { createLimiter, clientIp } = require('../lib/rateLimit');

const router = express.Router();

// Abuse protection for the two forms that send email to an address the visitor
// types in: a cap per visitor, and a cap per recipient so nobody's inbox can be
// flooded through us. A hidden "hp" field (honeypot) catches simple bots.
const inquireIpLimit = createLimiter({ max: 10 });
const contactIpLimit = createLimiter({ max: 5 });
const recipientLimit = createLimiter({ max: 3 });
// Looking up a quote by its reference is limited so references can't be guessed in bulk.
const lookupLimit = createLimiter({ max: 60 });
const REFERENCE_PATTERN = /^inq_\d+_[a-z0-9]+$/;
const TOO_MANY = 'Too many enquiries just now — please wait a while, or WhatsApp us directly.';
const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PRICING_PATH = path.join(__dirname, '..', 'data', 'pricing.json');
const HOTELS_PATH = path.join(__dirname, '..', 'data', 'hotels.json');

// GET /api/pricing — everything the frontend needs to render the configurators
router.get('/pricing', (req, res) => {
  const pricing = JSON.parse(fs.readFileSync(PRICING_PATH, 'utf8'));
  res.json(pricing);
});

// GET /api/hotels — hotel rate sheets for the accommodation configurator
router.get('/hotels', (req, res) => {
  const hotels = JSON.parse(fs.readFileSync(HOTELS_PATH, 'utf8'));
  res.json(hotels);
});

// GET /api/bank-details — direct bank-transfer details for the enquiry-sent page
router.get('/bank-details', (req, res) => {
  res.json({ ...BANK, ibanGrouped: groupIban(BANK.iban) });
});

// POST /api/inquire
// body: { customerName, customerEmail, customerPhone, items: [{ id, name, unitPrice, qty }] }
// Builds a quote from the basket, emails a copy to the customer and a
// notification (with the same quote attached) to the business — no
// payment is taken. Replaces the old Stripe checkout flow below, which is
// left in place but unused by the frontend.
router.post('/inquire', async (req, res) => {
  try {
    const body = req.body || {};
    if (body.hp) return res.json({ ok: true, order: { id: 'inq_received', items: [], total: 0 } });

    const customerName = cleanText(body.customerName, 100);
    const customerEmail = cleanText(body.customerEmail, 200);
    const customerPhone = cleanText(body.customerPhone, 40);

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: 'Your basket is empty.' });
    }
    if (!customerName) {
      return res.status(400).json({ error: 'Please enter a name for the enquiry.' });
    }
    if (!EMAIL_PATTERN.test(customerEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Prices and descriptions are rebuilt on the server from the rate sheets;
    // anything the browser sent that doesn't match a real product is refused.
    let normalizedItems;
    try {
      normalizedItems = priceBasket(body.items);
    } catch (err) {
      if (err instanceof BasketError) return res.status(400).json({ error: err.message });
      throw err;
    }

    if (!inquireIpLimit(clientIp(req)) || !recipientLimit(customerEmail.toLowerCase())) {
      return res.status(429).json({ error: TOO_MANY });
    }

    const total = normalizedItems.reduce((sum, item) => sum + item.total, 0);

    const id = `inq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const order = {
      id,
      sessionId: id,
      status: 'enquiry',
      customerName,
      customerEmail,
      customerPhone,
      items: normalizedItems,
      subtotal: total,
      total,
      currency: 'EUR',
      createdAt: new Date().toISOString()
    };

    orderStore.save(order);
    // Full copy in the server log too, so an enquiry can be recovered even if saved data is lost.
    console.log('[ENQUIRY]', JSON.stringify({ id, name: customerName, email: customerEmail, phone: customerPhone, total, items: normalizedItems.map((i) => `${i.name} x${i.qty} = ${i.total.toFixed(2)}`) }));
    await generateInvoicePDF(order);
    await sendInvoiceEmail(order, invoicePath(order.id));
    await sendEnquiryNotification(order, invoicePath(order.id));

    res.json({ ok: true, order });
  } catch (err) {
    console.error('inquire error:', err);
    res.status(500).json({ error: 'Could not send your enquiry. Please try again or WhatsApp us directly.' });
  }
});

// POST /api/contact
// body: { name, email, arrival, departure, groupSize, needs: [], notes, lang }
// Marketing-site contact form (accommodation/custom requests — no priced
// basket). Emails the business so the enquiry is never missed, and sends
// the customer an immediate acknowledgment, regardless of whether their
// device has a mail client configured for the mailto: link this replaces.
router.post('/contact', async (req, res) => {
  try {
    const body = req.body || {};
    if (body.hp) return res.json({ ok: true });

    const name = cleanText(body.name, 100);
    const email = cleanText(body.email, 200);
    const { arrival, departure } = body;

    if (!name) {
      return res.status(400).json({ error: 'Please enter your name.' });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!DATE_PATTERN.test(String(arrival || '')) || !DATE_PATTERN.test(String(departure || ''))) {
      return res.status(400).json({ error: 'Please choose your arrival and departure dates.' });
    }

    if (!contactIpLimit(clientIp(req)) || !recipientLimit(email.toLowerCase())) {
      return res.status(429).json({ error: TOO_MANY });
    }

    const contact = {
      name,
      email,
      arrival,
      departure,
      groupSize: cleanText(body.groupSize, 60),
      needs: Array.isArray(body.needs) ? body.needs.slice(0, 20).map((n) => cleanText(n, 60)).filter(Boolean) : [],
      notes: String(body.notes == null ? '' : body.notes).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, 2000),
      lang: cleanText(body.lang, 5).replace(/[^a-zA-Z-]/g, '') || 'en'
    };

    const record = { id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), ...contact };
    contactStore.save(record);
    console.log('[CONTACT]', JSON.stringify(record));

    await sendContactNotification(contact);
    await sendContactAcknowledgment(contact);

    res.json({ ok: true });
  } catch (err) {
    console.error('contact error:', err);
    res.status(500).json({ error: 'Could not send your enquiry. Please try again or WhatsApp us directly.' });
  }
});

// GET /api/order/:reference — the enquiry-sent page uses this to show the quote.
// Only what that page needs is returned: no name, email or phone number.
router.get('/order/:reference', (req, res) => {
  if (!lookupLimit(clientIp(req))) return res.status(429).json({ error: 'Too many requests.' });
  const order = REFERENCE_PATTERN.test(req.params.reference) ? orderStore.findBySessionId(req.params.reference) : null;
  if (!order) return res.status(404).json({ status: 'not_found' });
  res.json({
    status: 'paid',
    order: { id: order.id, items: order.items, total: order.total, currency: order.currency, createdAt: order.createdAt }
  });
});

// GET /api/invoice/:orderId — download the generated PDF quote
router.get('/invoice/:orderId', (req, res) => {
  if (!lookupLimit(clientIp(req))) return res.status(429).json({ error: 'Too many requests.' });
  if (!REFERENCE_PATTERN.test(req.params.orderId)) {
    return res.status(404).json({ error: 'Quote not found.' });
  }
  const filePath = invoicePath(req.params.orderId);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Quote not found — it may have expired. Check your email for your copy.' });
  }
  res.download(filePath, `quote-${req.params.orderId}.pdf`);
});

module.exports = router;
