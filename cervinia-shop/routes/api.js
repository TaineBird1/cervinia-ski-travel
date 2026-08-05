const express = require('express');
const fs = require('fs');
const path = require('path');

const stripe = require('../lib/stripeClient');
const orderStore = require('../lib/orderStore');
const { invoicePath, generateInvoicePDF } = require('../lib/invoice');
const { sendInvoiceEmail } = require('../lib/email');

const router = express.Router();

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

// POST /api/create-checkout-session
// body: { customerName, items: [{ id, name, unitPrice, qty }] }
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { customerName, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your basket is empty.' });
    }
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Please enter a name for the booking.' });
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
      success_url: `${domain}/shop/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/shop/cancel.html`,
      metadata: {
        customerName: customerName.trim(),
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
    customerEmail: session.customer_details?.email || '',
    items,
    subtotal: total,
    total,
    currency: (session.currency || 'eur').toUpperCase(),
    createdAt: new Date().toISOString()
  };
}

module.exports = router;
