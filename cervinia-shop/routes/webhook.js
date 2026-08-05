const express = require('express');
const stripe = require('../lib/stripeClient');
const orderStore = require('../lib/orderStore');
const { generateInvoicePDF, invoicePath } = require('../lib/invoice');
const { sendInvoiceEmail } = require('../lib/email');

const router = express.Router();

// Stripe requires the RAW body (not JSON-parsed) to verify the signature.
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    try {
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id, {
        expand: ['line_items', 'payment_intent']
      });

      const lineItems = session.line_items?.data || [];
      const items = lineItems.map((li) => ({
        name: li.description,
        qty: li.quantity,
        unitPrice: li.price.unit_amount / 100,
        total: (li.price.unit_amount * li.quantity) / 100
      }));
      const total = session.amount_total / 100;

      const order = {
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

      orderStore.save(order);
      await generateInvoicePDF(order);
      console.log(`✅ Payment confirmed and invoice generated for ${order.id}`);
      await sendInvoiceEmail(order, invoicePath(order.id));
    } catch (err) {
      console.error('Error processing checkout.session.completed:', err);
    }
  }

  res.json({ received: true });
});

module.exports = router;
