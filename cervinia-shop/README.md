# Cervinia Travel Services — Website, Trip Shop & Admin

A plain Node/Express app (no build step) with three parts:

- **Marketing site** (`site/`, served at `/`) in English, French (`/fr/`) and German (`/de/`),
  with a contact form.
- **Trip-planning shop** (`public/`, served at `/shop`) where customers build an
  itinerary — accommodation, airport transfers, equipment hire, lift passes and
  lessons — and send it as an **enquiry**. No payment is taken online.
- **Admin dashboard** (`admin/`, served at `/admin`) showing enquiries and
  contact-form messages.

## How an enquiry works

1. The customer builds a basket in the shop and clicks **Send Enquiry**.
2. `POST /api/inquire` rebuilds every price and description on the server from
   `data/pricing.json` and `data/hotels.json` (`lib/priceCheck.js`) — prices sent by
   the browser are never trusted — and refuses anything it doesn't recognise.
3. A PDF quote is generated (`lib/invoice.js`, with the direct bank-transfer details
   from `lib/bankDetails.js`), saved, and emailed to the customer and to the business
   through Resend (`lib/email.js`).
4. The customer lands on `/shop/success.html`, which offers the PDF and the bank details.
5. Once the team confirms availability, the customer pays by direct bank transfer using
   the enquiry reference as the payment reference.

The marketing-site contact form (`POST /api/contact`) saves the message, emails the
business and sends the customer an acknowledgment.

## Project layout

```
server.js            Express entry point: security headers, static sites, API
routes/api.js        pricing, hotels, bank details, enquiries, contact form, quote lookup/download
routes/admin.js      admin login and dashboard data
lib/priceCheck.js    server-side pricing of baskets
lib/invoice.js       PDF quote generator (pdfkit)
lib/email.js         emails via Resend (all customer text is HTML-escaped)
lib/bankDetails.js   bank-transfer details (one place to change them)
lib/rateLimit.js     in-memory rate limiter used by the forms and admin login
lib/dataDir.js       where enquiries and PDFs are saved (see DATA_DIR below)
lib/orderStore.js    shop enquiries      -> orders.json
lib/contactStore.js  contact messages    -> contacts.json
data/pricing.json    transfers, equipment, lift passes, lessons
data/hotels.json     hotel weekly rates, rooms, child policies
scripts/             rate-sheet importer; set-base-url.js for the domain switch
site/ public/ admin/ the three front ends
```

## Setup

```bash
npm install
cp .env.example .env     # then fill it in
npm start                # http://localhost:3000
```

Important settings (see `.env.example` for the full list):

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | emails the quote PDF. Without it enquiries still work; emails are skipped. |
| `RESEND_FROM_EMAIL` | sender. The default `onboarding@resend.dev` **only delivers to the Resend account owner**, so real customers will not receive emails until you verify your own domain in Resend and change this. |
| `BUSINESS_EMAIL` | inbox that receives enquiry notifications. |
| `ADMIN_PASSWORD` | admin login. Use a strong one. |
| `ADMIN_SESSION_SECRET` | optional; derived from the password if unset. |
| `DATA_DIR` | where enquiries and PDFs are saved. |

## Keeping enquiries across restarts

By default enquiries and quote PDFs are saved inside the app folder. On Render's free
plan that folder is wiped on every restart or deploy. To keep them, use a paid plan,
attach a persistent disk, and set `DATA_DIR` to its mount path (for example `/var/data`).
Every enquiry is also written in full to the server log (`[ENQUIRY]`, `[CONTACT]`) as a
recovery trail.

## Updating prices

Edit `data/pricing.json` / `data/hotels.json`, or regenerate them from the spreadsheets:

```bash
npm run import-pricing -- "Ski_Hire_Pass_Lessons.xlsx" "Hotel_Rates.xlsx"
```

Because the server prices baskets itself, rate changes apply to new quotes immediately.

## Switching to the real domain

Search-engine tags, the sitemap and sharing previews contain the site's web address.
When the branded domain goes live, update them all at once:

```bash
node scripts/set-base-url.js https://www.cerviniatravelservices.com
```

Then also set `BUSINESS_WEBSITE` on the server so the PDF shows the right address.

## Admin dashboard

Visit `/admin` and log in with `ADMIN_PASSWORD`. It shows quoted value, enquiries,
unique customers, a 30-day view, a category breakdown, recent enquiries and recent
contact-form messages. Login attempts are rate-limited.

## Safety measures

Per-visitor and per-recipient rate limits and a hidden honeypot field on both forms,
HTML-escaped emails, server-side pricing, no customer details returned by the quote
lookup, security headers including a content-security policy, and no secrets with
public default values.
