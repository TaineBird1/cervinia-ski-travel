# Cervinia Travel Services — Booking Shop

A small, bright, button-driven shop where customers pick airport transfers,
equipment hire, ski lift passes and lessons, pay for the lot with Stripe, and
get an itemized PDF invoice.

Open this folder in Claude Code and ask it to keep building on top of this —
it's a plain Node/Express app with no build step, so there's nothing to
compile.

## What's inside

```
cervinia-shop/
├── server.js                  Express app entry point
├── routes/
│   ├── api.js                 pricing, checkout session, order lookup, invoice download
│   └── webhook.js             Stripe webhook — confirms payment, generates the invoice
├── lib/
│   ├── stripeClient.js
│   ├── invoice.js             PDF invoice generator (pdfkit)
│   └── orderStore.js          simple JSON-file order storage
├── data/
│   ├── pricing.json           all prices shown on the site (transfers/equipment/passes/lessons)
│   ├── hotels.json            hotel rate sheets — parsed, not wired into checkout yet (see note below)
│   └── orders.json            paid orders (auto-created)
├── scripts/
│   └── importPricingFromExcel.js   regenerate pricing.json + hotels.json from your spreadsheets
├── public/                    the actual website (plain HTML/CSS/JS)
│   ├── index.html
│   ├── success.html / cancel.html
│   ├── css/styles.css
│   └── js/app.js
└── invoices/                  generated PDF invoices (auto-created)
```

## 1. Install & configure

```bash
cd cervinia-shop
npm install
cp .env.example .env
```

Open `.env` and fill in:

- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` — from your
  [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys). Use the
  **test** keys first (`sk_test_...` / `pk_test_...`).
- `STRIPE_WEBHOOK_SECRET` — see step 3 below.

Never commit `.env` or paste your secret key anywhere public — `.gitignore`
already excludes it.

## 2. Run it

```bash
npm start
```

Visit `http://localhost:3000`.

## 3. Get webhooks working (required for real payments)

Payments are confirmed by a Stripe **webhook**, not just the redirect back to
your site — this is what actually creates the order and generates the
invoice, and it's what makes the flow trustworthy (a customer can't just type
in `/success.html` and fake a paid order).

For local testing, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/webhook
```

It will print a webhook signing secret starting with `whsec_...` — put that
in `STRIPE_WEBHOOK_SECRET` in your `.env` and restart the server.

In production, add a webhook endpoint in the Stripe Dashboard pointing at
`https://yourdomain.com/webhook`, subscribed to the `checkout.session.completed`
event, and use the signing secret it gives you.

## 4. Updating prices from your spreadsheets

Whenever you get a new rate sheet, run:

```bash
npm run import-pricing -- "Website - Ski_Hire_Pass_Lessons.xlsx" "Website - Cervinia_Hotel_Rates_26-27 from 24-25.xlsx"
```

(You can pass just one file if you only need to update one of the two —
`npm run import-pricing -- "" "Hotel_Rates.xlsx"` updates hotels only, etc.)

This script is built around the **actual layout the client sent**, not a
generic template — it reads three tabs from the ski workbook (`Ski Hire
Rates Long`, `Ski Pass Rate Sheet`, `Ski Lessons Rates`) and one sheet per
hotel from the hotel workbook. The expected structure is documented in
detail at the top of `scripts/importPricingFromExcel.js`. If a future
spreadsheet renames a tab or moves columns around, that's the first place to
look.

Current data in `data/pricing.json` (imported from
`Website - Ski_Hire_Pass_Lessons.xlsx`):

- **Equipment Hire** — real rates for all 7 categories (Skis & Poles, Ski
  Boots, Snowboard, Snowboard Boots, Ski Accessories, and the Ski/Snowboard
  "Set" combos), every ability tier, 1–13 (or 14, for lockers) days.
- **Ski Lift Passes** — real rates by age tier (Adult, Senior, Young U24,
  Junior U16, Child U8) for 1–13 consecutive days, 2026/27 season. This sheet
  only covers the local Italian-side pass — there's no International/Zermatt
  price table in it, so that's shown as a note (kiosk upgrade) rather than a
  bookable option. Send that rate if you want it added as a real line item.
- **Ski & Snowboard Lessons** — real rates for Private lessons (1–6 people ×
  2/3/4 hours/full day × Low-season AM/PM or High season) and Group lessons
  (3-day / 5-day, per person, Low/High season).
- **Airport Transfers** — still placeholder numbers. No transfer rate sheet
  has been sent yet — send one and re-run the import (you'll need to add a
  "Transfers" sheet/parser to the script, or just tell Claude Code the
  format and ask it to wire it in).

`data/hotels.json` (imported from `Website - Cervinia_Hotel_Rates_26-27 from
24-25.xlsx`) has real 7-night week-by-week, per-person, per-room-type rates
for all 6 hotels (Perruquet, Lyskamm, Da Compagnoni, Bucaneve, Miravidi,
Chambres Mont Cervin), plus each hotel's notes (tourist tax, board basis,
minimum stay, child discounts, cancellation policy). **It isn't wired into
the shop's basket yet** — accommodation wasn't part of the original
transfers/equipment/passes/lessons basket, and a hotel booking needs a
different UI (pick a hotel → pick a 7-night arrival week → pick a room type)
rather than the day-count buttons used elsewhere. If you'd like a 5th
"Accommodation" category added to the basket using this data, ask Claude
Code — the data is already clean and ready to build against.

## 5. How checkout works

1. Customer configures each item using button groups (no dropdowns anywhere)
   and adds it to the basket.
2. The basket drawer shows a live total and a name field.
3. "Pay & Checkout" calls `POST /api/create-checkout-session`, which creates a
   Stripe Checkout Session and redirects the customer to Stripe's own secure
   payment page (so this app never touches card details).
4. On success, Stripe redirects to `/success.html`, and the webhook (step 3)
   confirms the payment, saves the order to `data/orders.json`, generates
   `invoices/{orderId}.pdf`, and emails it to the customer via Resend
   (see step 6).
5. `/success.html` polls `/api/order/:sessionId` until the order appears, then
   shows a "Download Invoice" button — useful as a backup even once email is
   set up, e.g. if the customer mistypes their email at checkout.

## 6. Email delivery (optional)

Invoices are emailed automatically via [Resend](https://resend.com) once
`RESEND_API_KEY` is set — until then, checkout still works fine and the
invoice is just a manual download from the success page (no crash either
way; `lib/email.js` skips silently if the key or the customer's email is
missing).

1. Sign up at [resend.com](https://resend.com) and create an API key
   (Dashboard → API Keys)
2. Add `RESEND_API_KEY` to your `.env` (or Render environment variables)
3. `RESEND_FROM_EMAIL` defaults to `onboarding@resend.dev`, which works
   immediately with no setup — good enough to start. Once you've verified
   your own domain in Resend, switch it to something like
   `Cervinia Travel Services <bookings@cerviniatravelservices.com>` instead.

## Notes on what's simplified

- Orders are stored in a single JSON file (`data/orders.json`) — fine for a
  small operation; swap in a real database if volume grows.
- No tax/VAT line is applied — add one in `routes/api.js` /
  `lib/invoice.js` if you need to charge it.
