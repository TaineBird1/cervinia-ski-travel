const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const INVOICES_DIR = path.join(__dirname, '..', 'invoices');
if (!fs.existsSync(INVOICES_DIR)) fs.mkdirSync(INVOICES_DIR, { recursive: true });

const BUSINESS = {
  name: process.env.BUSINESS_NAME || 'Cervinia Travel Services',
  email: process.env.BUSINESS_EMAIL || 'info@cerviniatravelservices.com',
  whatsapp: process.env.BUSINESS_WHATSAPP || '+39 366 879 4487',
  address: process.env.BUSINESS_ADDRESS || 'Breuil-Cervinia, Aosta Valley, Italy'
};

/**
 * Generates a PDF invoice for a paid order and saves it to /invoices/{order.id}.pdf
 * @param {object} order - { id, sessionId, customerName, customerEmail, items, subtotal, total, currency, createdAt, paymentIntentId }
 * @returns {string} absolute path to the generated PDF
 */
function generateInvoicePDF(order) {
  const filePath = path.join(INVOICES_DIR, `${order.id}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const currencySymbol = (order.currency || 'EUR').toUpperCase() === 'EUR' ? '€' : order.currency;

  // Header
  doc.fillColor('#0c2438').fontSize(22).font('Helvetica-Bold').text(BUSINESS.name, 50, 50);
  doc.fillColor('#5b6b78').fontSize(10).font('Helvetica')
    .text(BUSINESS.address)
    .text(`Email: ${BUSINESS.email}`)
    .text(`WhatsApp: ${BUSINESS.whatsapp}`);

  doc.moveDown(1.5);
  doc.fillColor('#0c2438').fontSize(16).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
  doc.fillColor('#5b6b78').fontSize(10).font('Helvetica')
    .text(`Invoice #: ${order.id}`, { align: 'right' })
    .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-GB')}`, { align: 'right' })
    .text(`Payment ref: ${order.paymentIntentId || order.sessionId}`, { align: 'right' });

  doc.moveDown(1.5);
  doc.fillColor('#0c2438').fontSize(11).font('Helvetica-Bold').text('Bill To');
  doc.fillColor('#5b6b78').fontSize(10).font('Helvetica')
    .text(order.customerName || 'Guest')
    .text(order.customerEmail || '');

  doc.moveDown(1.5);

  // Table header
  const tableTop = doc.y + 10;
  const col = { desc: 50, qty: 340, unit: 400, total: 470 };
  doc.fillColor('#ffffff').rect(50, tableTop, 495, 24).fill('#0c2438');
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
  doc.text('Description', col.desc + 8, tableTop + 7);
  doc.text('Qty', col.qty, tableTop + 7);
  doc.text('Unit Price', col.unit, tableTop + 7);
  doc.text('Total', col.total, tableTop + 7);

  let y = tableTop + 24;
  doc.font('Helvetica').fontSize(10);
  order.items.forEach((item, i) => {
    const rowHeight = 22;
    if (i % 2 === 0) {
      doc.fillColor('#f2f8fb').rect(50, y, 495, rowHeight).fill();
    }
    doc.fillColor('#0c2438');
    doc.text(item.name, col.desc + 8, y + 6, { width: 280 });
    doc.text(String(item.qty), col.qty, y + 6);
    doc.text(`${currencySymbol}${item.unitPrice.toFixed(2)}`, col.unit, y + 6);
    doc.text(`${currencySymbol}${item.total.toFixed(2)}`, col.total, y + 6);
    y += rowHeight;
  });

  y += 10;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2ecf2').stroke();
  y += 12;

  doc.font('Helvetica').fontSize(10).fillColor('#5b6b78');
  doc.text('Subtotal', col.unit, y);
  doc.fillColor('#0c2438').text(`${currencySymbol}${order.subtotal.toFixed(2)}`, col.total, y);
  y += 18;

  doc.fillColor('#5b6b78').text('Total Paid', col.unit, y);
  doc.fillColor('#0c2438').font('Helvetica-Bold').text(`${currencySymbol}${order.total.toFixed(2)}`, col.total, y);
  y += 26;

  doc.fillColor('#1fb959').font('Helvetica-Bold').fontSize(11).text('PAID', col.unit, y);

  doc.moveDown(4);
  doc.fillColor('#5b6b78').font('Helvetica').fontSize(9)
    .text('Thank you for booking with Cervinia Travel Services — we don\'t just go there, we are there.', 50, 720, { width: 495, align: 'center' });

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
