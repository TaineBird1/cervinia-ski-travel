const express = require('express');
const fs = require('fs');
const path = require('path');

const stripe = require('../lib/stripeClient');
const orderStore = require('../lib/orderStore');
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

    await sendContactNotification(contact);
    await sendContactAcknowledgment(contact);

    res.json({ ok: true });
  } catch (err) {
    console.error('contact error:', err);
    res.status(500).json({ error: 'Could not send your enquiry. Please try again or WhatsApp us directly.' });
  }
});

// POST /api/create-checkout-session
// body: { customerName, customerEmail, customerPhone, items: [{ id, name, unitPrice, qty }] }
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, items } = req.body;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your basket is empty.' });
    }
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Please enter a name for the booking.' });
    }
    if (!customerEmail || !emailPattern.test(customerEmail.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const line_items = items.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: { name: item.name },
        unit_amount: Math.round(Number(item.unitPrice) * 100)
      },
      quantity: Math.max(1, parseInt(item.qty, 10) || 1)
    }));

    const domain = process.env.DOMAIN || `${req.protocol}://${req.get('host')}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      customer_email: customerEmail.trim(),
      success_url: `${domain}/shop/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/shop/cancel.html`,
      metadata: {
        customerName: customerName.trim(),
        customerPhone: (customerPhone || '').trim().slice(0, 40),
        // Stripe metadata values must be strings and are capped at 500 chars,
        // so we keep a compact copy of the basket for invoice generation.
        basket: JSON.stringify(items).slice(0, 490)
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
});

// GET /api/order/:sessionId — poll after redirect back from Stripe.
// The order record is created by the webhook once payment is confirmed,
// so this may return { status: 'processing' } for a few seconds first.
router.get('/order/:sessionId', async (req, res) => {
  try {
    const existing = orderStore.findBySessionId(req.params.sessionId);
    if (existing) {
      return res.json({ status: 'paid', order: existing });
    }

    // Fallback for local dev if the webhook hasn't fired yet (e.g. you forgot
    // to run `stripe listen`): check directly with Stripe and, if paid,
    // generate the order/invoice right here instead of waiting.
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, {
      expand: ['line_items', 'payment_intent']
    });

    if (session.payment_status === 'paid') {
      const order = await buildOrderFromSession(session);
      orderStore.save(order);
      await generateInvoicePDF(order);
      await sendInvoiceEmail(order, invoicePath(order.id));
      return res.json({ status: 'paid', order });
    }

    res.json({ status: 'processing' });
  } catch (err) {
    console.error('order lookup error:', err);
    res.status(500).json({ error: 'Could not look up your order.' });
  }
});

// GET /api/invoice/:orderId — download the generated PDF
router.get('/invoice/:orderId', (req, res) => {
  const filePath = invoicePath(req.params.orderId);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Invoice not ready yet — try again in a moment.' });
  }
  res.download(filePath, `invoice-${req.params.orderId}.pdf`);
});

async function buildOrderFromSession(session) {
  const lineItems = session.line_items?.data || [];
  const items = lineItems.map((li) => ({
    name: li.description,
    qty: li.quantity,
    unitPrice: li.price.unit_amount / 100,
    total: (li.price.unit_amount * li.quantity) / 100
  }));
  const total = session.amount_total / 100;

  return {
    id: session.id.replace('cs_', 'ord_'),
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'object' ? session.payment_intent.id : session.payment_intent,
    customerName: session.metadata?.customerName || session.customer_details?.name || 'Guest',
    customerEmail: session.customer_details?.email || session.customer_email || '',
    customerPhone: session.metadata?.customerPhone || '',
    items,
    subtotal: total,
    total,
    currency: (session.currency || 'eur').toUpperCase(),
    createdAt: new Date().toISOString()
  };
}

module.exports = router;
