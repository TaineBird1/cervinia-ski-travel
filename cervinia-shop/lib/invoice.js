const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { BANK, groupIban } = require('./bankDetails');

const { INVOICES_DIR } = require('./dataDir');
const i18n = require('./i18nServer');

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
 * Generates a PDF quote for an enquiry and saves it to /invoices/{order.id}.pdf
 * @param {object} order - { id, sessionId, customerName, customerEmail, customerPhone, items, subtotal, total, currency, createdAt }
 * @returns {string} absolute path to the generated PDF
 */
function generateInvoicePDF(order) {
  const filePath = path.join(INVOICES_DIR, `${order.id}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const T = i18n.get(order.lang);
  const S = T.pdf;
  const money = require('../public/js/i18n.js').get(T.code).money;
  const currencySymbol = (order.currency || 'EUR').toUpperCase() === 'EUR' ? '€' : order.currency;

  // ---------- Header: logo left, business contact block right ----------
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, LEFT, 44, { width: 72 });
  }

  doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(BUSINESS.name, 300, 48, { width: 245, align: 'right' });
  doc.fillColor(SLATE).fontSize(9).font('Helvetica')
    .text(S.web(BUSINESS.website), 300, 64, { width: 245, align: 'right' })
    .text(S.whatsappShort(BUSINESS.whatsapp), 300, 77, { width: 245, align: 'right' })
    .text(S.email(BUSINESS.email), 300, 90, { width: 245, align: 'right' });

  // ---------- "Invoice | Statement" box + date/booking ref ----------
  const boxTop = 130;
  const boxWidth = 280;
  const boxHeight = 96;

  doc.rect(LEFT, boxTop, boxWidth, boxHeight).strokeColor(LINE).lineWidth(1).stroke();
  doc.moveTo(LEFT, boxTop + 26).lineTo(LEFT + boxWidth, boxTop + 26).strokeColor(LINE).stroke();
  doc.fillColor(INK).fontSize(13).font('Helvetica-Bold').text(S.quoteRequest, LEFT + 10, boxTop + 6);

  doc.fillColor(INK).fontSize(10).font('Helvetica');
  const clientLines = [
    order.customerName || S.guest,
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
  doc.fillColor(SLATE).fontSize(9).font('Helvetica').text(S.date, metaX, boxTop, { width: metaWidth - 90, align: 'right' });
  doc.fillColor(INK).fontSize(10).font('Helvetica-Bold')
    .text(new Date(order.createdAt).toLocaleDateString(T.dateLocale, { day: '2-digit', month: 'short', year: 'numeric' }), metaX, boxTop, { width: metaWidth, align: 'right' });

  doc.fillColor(SLATE).fontSize(9).font('Helvetica-Oblique').text(S.enquiryRef, metaX, boxTop + 18, { width: metaWidth, align: 'right' });
  doc.fillColor(INK).fontSize(9).font('Helvetica-Bold').text(order.id, metaX, boxTop + 30, { width: metaWidth, align: 'right' });

  doc.fillColor(SLATE).fontSize(9).font('Helvetica-Oblique').text(S.status, metaX, boxTop + 50, { width: metaWidth, align: 'right' });
  doc.fillColor(INK).fontSize(9).font('Helvetica-Bold').text(S.awaiting, metaX, boxTop + 62, { width: metaWidth, align: 'right' });

  // ---------- Itemized table ----------
  const tableTop = boxTop + boxHeight + 24;
  const col = { desc: LEFT, qty: LEFT + 290, unit: LEFT + 345, total: LEFT + 420 };

  doc.rect(LEFT, tableTop, WIDTH, 24).fill(INK);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
  doc.text(S.description, col.desc + 8, tableTop + 7);
  doc.text(S.qty, col.qty, tableTop + 7);
  doc.text(S.unitPrice, col.unit, tableTop + 7);
  doc.text(S.total, col.total, tableTop + 7);

  let y = tableTop + 24;
  const descWidth = col.qty - col.desc - 16;
  doc.font('Helvetica').fontSize(9.5);
  order.items.forEach((item, i) => {
    const itemName = (T.code !== 'en' && item.nameLocal) || item.name;
    const textHeight = doc.heightOfString(itemName, { width: descWidth });
    const rowHeight = Math.max(22, textHeight + 12);
    if (i % 2 === 0) {
      doc.fillColor('#f2f8fb').rect(LEFT, y, WIDTH, rowHeight).fill();
    }
    doc.fillColor(INK);
    doc.text(itemName, col.desc + 8, y + 6, { width: descWidth });
    doc.text(String(item.qty), col.qty, y + 6);
    doc.text(`${currencySymbol}${money(item.unitPrice)}`, col.unit, y + 6);
    doc.text(`${currencySymbol}${money(item.total)}`, col.total, y + 6);
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
  doc.text(S.subTotal, col.unit, y);
  doc.fillColor(INK).text(`${currencySymbol}${money(order.subtotal)}`, col.total, y);
  y += 20;

  doc.fillColor(SLATE).font('Helvetica-Bold').text(S.estimatedTotal, col.unit, y);
  doc.fillColor(INK).text(`${currencySymbol}${money(order.total)}`, col.total, y);
  y += 26;

  doc.fillColor('#c87f0a').font('Helvetica-Bold').fontSize(11).text(S.noPayment, LEFT, y, { width: WIDTH, align: 'right' });
  y += 18;
  doc.fillColor(SLATE).font('Helvetica').fontSize(8.5)
    .text(S.bankOnPage2, LEFT, y, { width: RIGHT - LEFT, align: 'right' });

  // ---------- Footer ----------
  const footerLineY = Math.max(740, y + 40);
  doc.moveTo(LEFT, footerLineY).lineTo(RIGHT, footerLineY).strokeColor(LINE).stroke();
  doc.fillColor(SLATE).font('Helvetica').fontSize(9)
    .text(S.thanks, LEFT, footerLineY + 10, { width: WIDTH, align: 'center' });
  doc.fillColor('#1f7fae').font('Helvetica-Oblique').fontSize(9)
    .text(S.whatsapp(BUSINESS.whatsapp), LEFT, footerLineY + 26, { width: WIDTH, align: 'center' })
    .text(BUSINESS.website, LEFT, footerLineY + 40, { width: WIDTH, align: 'center' });

  addTermsPage(doc, order, S);

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

function rule(doc) {
  const ruleY = doc.y;
  doc.moveTo(LEFT, ruleY).lineTo(RIGHT, ruleY).strokeColor(LINE).stroke();
}

// "Pay by direct bank transfer" panel at the top of the terms page.
function addBankBox(doc, order, S) {
  const top = doc.y;
  const rows = [
    [S.bankLabels.accountName, BANK.accountName],
    [S.bankLabels.bank, `${BANK.bankName}, ${BANK.bankAddress}`],
    [S.bankLabels.account, BANK.accountNumber],
    [S.bankLabels.iban, groupIban(BANK.iban)],
    [S.bankLabels.bic, BANK.bic],
    [S.bankLabels.reference, order.id]
  ];
  const rowH = 16;
  const boxH = 30 + rows.length * rowH + 40;

  doc.rect(LEFT, top, WIDTH, boxH).fillAndStroke('#f2f8fb', LINE);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(S.bankTitle, LEFT + 12, top + 10);

  let y = top + 32;
  rows.forEach(([label, value]) => {
    doc.fillColor(SLATE).font('Helvetica').fontSize(9.5).text(label, LEFT + 12, y, { width: 110 });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5).text(value, LEFT + 125, y, { width: WIDTH - 140 });
    y += rowH;
  });

  doc.fillColor(SLATE).font('Helvetica-Oblique').fontSize(8.5)
    .text(S.bankNote,
      LEFT + 12, y + 6, { width: WIDTH - 24 });

  doc.y = top + boxH;
  doc.x = LEFT;
}

// Terms page appended to every quote. Adapted from the client's reference
// terms sheet — reworded to make clear this document is an unpaid quote
// generated from an enquiry, not a confirmed/paid booking.
function addTermsPage(doc, order, S) {
  doc.addPage();

  addBankBox(doc, order, S);
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(S.exclTitle);
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(10.5).fillColor(INK)
    .text(S.exclIntro);
  doc.moveDown(0.5);

  doc.fontSize(9.5).list(S.exclList, { bulletRadius: 2, textIndent: 12 });

  doc.moveDown(0.7);
  doc.font('Helvetica-Bold').fontSize(9.5)
    .text(S.availability);

  doc.moveDown(0.8);
  rule(doc);
  doc.moveDown(0.8);

  doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(S.docsTitle);
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9.5).list(S.docsList, { bulletRadius: 2, textIndent: 12 });

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK)
    .text(S.estimateNote, { align: 'center' });

  doc.moveDown(0.8);
  rule(doc);
  doc.moveDown(0.8);

  doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(S.importantTitle);
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9.5).list(S.importantList, { bulletRadius: 2, textIndent: 12 });

  doc.moveDown(0.3);
  doc.fillColor('#1f7fae').font('Helvetica').fontSize(9.5)
    .text(S.visit(BUSINESS.website), { link: `https://${BUSINESS.website}`, underline: true });

  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(8).fillColor(SLATE).text(S.eoe);

  doc.moveDown(1);
  rule(doc);
  doc.moveDown(0.6);
  doc.fillColor('#1f7fae').font('Helvetica-Oblique').fontSize(9)
    .text(S.whatsapp(BUSINESS.whatsapp), { align: 'center' })
    .text(BUSINESS.website, { align: 'center' });
}

function invoicePath(orderId) {
  return path.join(INVOICES_DIR, `${path.basename(String(orderId))}.pdf`);
}

module.exports = { generateInvoicePDF, invoicePath, BUSINESS };
