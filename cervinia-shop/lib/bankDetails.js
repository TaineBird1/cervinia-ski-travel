// Direct bank-transfer details shown to customers on the PDF quote, the quote
// email and the enquiry-sent page. One place to change them. The account name
// must be written exactly as the bank holds it.
const BANK = {
  accountName: process.env.BANK_ACCOUNT_NAME || 'Cervinia T Services',
  bankName: process.env.BANK_NAME || 'Unicredit Banca',
  bankAddress: process.env.BANK_ADDRESS || 'Via Carrel 37, Breuil-Cervinia (AO)',
  accountNumber: process.env.BANK_ACCOUNT_NUMBER || '000041158078',
  iban: process.env.BANK_IBAN || 'IT58R0200831689000041158078',
  bic: process.env.BANK_BIC || 'UNCRITM1821'
};

// IBANs are easiest to read and copy in groups of four.
function groupIban(iban) {
  return String(iban).replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

module.exports = { BANK, groupIban };
