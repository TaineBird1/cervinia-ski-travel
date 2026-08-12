const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const INVOICES_DIR = path.join(__dirname, '..', 'invoices');
if (!fs.existsSync(INVOICES_DIR)) fs.mkdirSync(INVOICES_DIR, { recursive: true });

const LOGO_PATH = path.join(__dirname, '..', 'site', 'logo.png');

const BUSINESS = {
  name: process.env.BUSINESS_NAME || 'Cervinia Travel Services',
  website: process.env.BUSINESS_WEBSITE || 'www.CerviniaTravelServices.com',
  email: process.env.BUSINESS_EMAIL || 'info@CerviniaTravelServices.com',
  whatsapp: process.env.BUSINESS_WHATSAPP || '+39 366 879 4487',
  address: process.env.BUSINESS_ADDRESS || 'Breuil-Cervinia, Aosta Valley, Italy'
};

const INK = '#0c2438';
const SLATE = '#5b6b78';
const LINE = '#e2ecf2';
const LEFT = 50;
const RIGHT = 545;
const WIDTH = RIGHT - LEFT;

/**
 * Generates a PDF invoice for a paid order and saves it to /invoices/{order.id}.pdf
 * @param {object} order - { id, sessionId, customerName, customerEmail, customerPhone, items, subtotal, total, currency, createdAt, paymentIntentId }
 * @returns {string} absolute path to the generated PDF
 */
function generateInvoicePDF(order) {
  const filePath = path.join(INVOICES_DIR, `${order.id}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const currencySymbol = (order.currency || 'EUR').toUpperCase() === 'EUR' ? '€' : order.currency;

  // ---------- Header: logo left, business contact block right ----------
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, LEFT, 44, { width: 72 });
  }

  doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(BUSINESS.name, 300, 48, { width: 245, align: 'right' });
  doc.fillColor(SLATE).fontSize(9).font('Helvetica')
    .text(`Web: ${BUSINESS.website}`, 300, 64, { width: 245, align: 'right' })
    .text(`Whatsapp: ${BUSINESS.whatsapp}`, 300, 77, { width: 245, align: 'right' })
    .text(`Email: ${BUSINESS.email}`, 300, 90, { width: 245, align: 'right' });

  // ---------- "Invoice | Statement" box + date/booking ref ----------
  const boxTop = 130;
  const boxWidth = 280;
  const boxHeight = 96;

  doc.rect(LEFT, boxTop, boxWidth, boxHeight).strokeColor(LINE).lineWidth(1).stroke();
  doc.moveTo(LEFT, boxTop + 26).lineTo(LEFT + boxWidth, boxTop + 26).strokeColor(LINE).stroke();
  doc.fillColor(INK).fontSize(13).font('Helvetica-Bold').text('Invoice | Statement', LEFT + 10, boxTop + 6);

  doc.fillColor(INK).fontSize(10).font('Helvetica');
  const clientLines = [
    order.customerName || 'Guest',
    order.customerEmail || '',
    order.customerPhone || ''
  ].filter(Boolean);
  let clientY = boxTop + 36;
  clientLines.forEach((line) => {
    doc.text(line, LEFT + 10, clientY, { width: boxWidth - 20 });
    clientY += 16;
  });

  const metaX = LEFT + boxWidth + 20;
  const metaWidth = RIGHT - metaX;
  doc.fillColor(SLATE).fontSize(9).font('Helvetica').text('Date:', metaX, boxTop, { width: metaWidth - 90, align: 'right' });
  doc.fillColor(INK).fontSize(10).font('Helvetica-Bold')
    .text(new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), metaX, boxTop, { width: metaWidth, align: 'right' });

  doc.fillColor(SLATE).fontSize(9).font('Helvetica-Oblique').text('Booking Ref:', metaX, boxTop + 18, { width: metaWidth, align: 'right' });
  doc.fillColor(INK).fontSize(9).font('Helvetica-Bold').text(order.id, metaX, boxTop + 30, { width: metaWidth, align: 'right' });

  doc.fillColor(SLATE).fontSize(9).font('Helvetica-Oblique').text('Payment ref:', metaX, boxTop + 50, { width: metaWidth, align: 'right' });
  doc.fillColor(INK).fontSize(8).font('Helvetica').text(order.paymentIntentId || order.sessionId, metaX, boxTop + 62, { width: metaWidth, align: 'right' });

  // ---------- Itemized table ----------
  const tableTop = boxTop + boxHeight + 24;
  const col = { desc: LEFT, qty: LEFT + 290, unit: LEFT + 345, total: LEFT + 420 };

  doc.rect(LEFT, tableTop, WIDTH, 24).fill(INK);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
  doc.text('Description', col.desc + 8, tableTop + 7);
  doc.text('Qty', col.qty, tableTop + 7);
  doc.text('Unit Price', col.unit, tableTop + 7);
  doc.text('Total', col.total, tableTop + 7);

  let y = tableTop + 24;
  const descWidth = col.qty - col.desc - 16;
  doc.font('Helvetica').fontSize(9.5);
  order.items.forEach((item, i) => {
    const textHeight = doc.heightOfString(item.name, { width: descWidth });
    const rowHeight = Math.max(22, textHeight + 12);
    if (i % 2 === 0) {
      doc.fillColor('#f2f8fb').rect(LEFT, y, WIDTH, rowHeight).fill();
    }
    doc.fillColor(INK);
    doc.text(item.name, col.desc + 8, y + 6, { width: descWidth });
    doc.text(String(item.qty), col.qty, y + 6);
    doc.text(`${currencySymbol}${item.unitPrice.toFixed(2)}`, col.unit, y + 6);
    doc.text(`${currencySymbol}${item.total.toFixed(2)}`, col.total, y + 6);
    y += rowHeight;
  });

  doc.rect(LEFT, tableTop, WIDTH, y - tableTop).strokeColor(LINE).lineWidth(1).stroke();

  // Totals + footer need ~180pt; start a fresh page if that won't fit.
  if (y > 720 - 180) {
    doc.addPage();
    y = 50;
  }

  y += 14;
  doc.font('Helvetica').fontSize(10).fillColor(SLATE);
  doc.text('Sub-total', col.unit, y);
  doc.fillColor(INK).text(`${currencySymbol}${order.subtotal.toFixed(2)}`, col.total, y);
  y += 20;

  doc.fillColor(SLATE).font('Helvetica-Bold').text('Total Paid', col.unit, y);
  doc.fillColor(INK).text(`${currencySymbol}${order.total.toFixed(2)}`, col.total, y);
  y += 26;

  doc.fillColor('#1fb959').font('Helvetica-Bold').fontSize(11).text('PAID IN FULL', col.unit, y);

  // ---------- Footer ----------
  const footerLineY = Math.max(740, y + 40);
  doc.moveTo(LEFT, footerLineY).lineTo(RIGHT, footerLineY).strokeColor(LINE).stroke();
  doc.fillColor(SLATE).font('Helvetica').fontSize(9)
    .text('Thank you for booking with Cervinia Travel Services — we don\'t just go there, we are there.', LEFT, footerLineY + 10, { width: WIDTH, align: 'center' });
  doc.fillColor('#1f7fae').font('Helvetica-Oblique').fontSize(9)
    .text(`Cervinia Travel Services WhatsApp: ${BUSINESS.whatsapp}`, LEFT, footerLineY + 26, { width: WIDTH, align: 'center' })
    .text(BUSINESS.website, LEFT, footerLineY + 40, { width: WIDTH, align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

function invoicePath(orderId) {
  return path.join(INVOICES_DIR, `${orderId}.pdf`);
}

module.exports = { generateInvoicePDF, invoicePath, BUSINESS };
