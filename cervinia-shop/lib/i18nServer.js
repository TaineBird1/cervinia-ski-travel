// Customer-facing wording for the quote PDF and the emails the customer receives,
// in English (the original text) and Italian. Messages to the business itself stay
// in English. Shop screen text and line names live in public/js/i18n.js.
const en = {
  code: 'en',
  dateLocale: 'en-GB',
  pdf: {
    quoteRequest: 'Quote Request',
    date: 'Date:',
    enquiryRef: 'Enquiry Ref:',
    status: 'Status:',
    awaiting: 'Awaiting Confirmation',
    description: 'Description',
    qty: 'Qty',
    unitPrice: 'Unit Price',
    total: 'Total',
    subTotal: 'Sub-total',
    estimatedTotal: 'Estimated Total',
    noPayment: 'NO PAYMENT TAKEN — QUOTE ONLY',
    bankOnPage2: 'Bank transfer details are on page 2 - please only pay once we have confirmed your booking.',
    thanks: "Thank you for your enquiry with Cervinia Travel Services — we don't just go there, we are there.",
    whatsapp: (n) => `Cervinia Travel Services WhatsApp: ${n}`,
    web: (w) => `Web: ${w}`,
    whatsappShort: (n) => `WhatsApp: ${n}`,
    email: (e) => `Email: ${e}`,
    bankTitle: 'Pay by direct bank transfer',
    bankLabels: { accountName: 'Account name', bank: 'Bank', account: 'Account (Conto)', iban: 'IBAN', bic: 'BIC / SWIFT', reference: 'Payment reference' },
    bankNote: 'Please pay only once our team has confirmed availability and your final price. Use the account name exactly as shown and quote the payment reference.',
    exclTitle: 'Package Cost EXCLUSIONS:',
    exclIntro: 'The following are NOT included in the package price unless specifically stated otherwise.',
    exclList: [
      'Airfare, airport taxes, and surcharges, unless flights are specifically included.',
      'Ski Lessons, which are an optional extra, and payable in the resort/village, unless stated otherwise.',
      'Entertainment programmes, which are optional extras unless stated otherwise.',
      'Meals and drinks not specifically included in the itinerary.',
      'Local tourist tax is payable directly on check-in, estimated at €2 - €3 per person, per night. U15 are Free.',
      'Any services not specifically listed under the package inclusions.',
      'Personal expenses, including but not limited to shopping, gratuities, and additional services.',
      'Early check-in and late check-out, unless specifically included.',
      'Passport and visa costs.',
      'Courier fees, where applicable.'
    ],
    availability: 'This package is subject to availability and supplier rate changes. When you are ready to book your ski holiday, please contact us for an official quotation and the most up-to-date pricing.',
    docsTitle: 'Travel Documents and Visas',
    docsList: [
      'A Valid passport is required, and is recommended it remains valid for at least six (6) months after the return date and contains a minimum of two (2) blank pages, as required for International Travel.',
      'Travellers are personally responsible for obtaining all necessary permits, visas, and meeting all entry requirements. Please check with the relevant authorities to ensure compliance before departure.',
      "It is the traveller's sole responsibility to ensure that they meet all health, vaccination, immunisation requirements for international travel."
    ],
    estimateNote: 'This is a price estimate, not a confirmed booking — our team will check availability and be in touch to confirm pricing and arrange payment.',
    importantTitle: 'Important Information',
    importantList: [
      'Any increase in supplier costs, including but not limited to hotels, airlines, transfers, exchange rates, or related travel services may result in an increase to the final tour cost.',
      'Cervinia Travel Services will make every effort to ensure that all arrangements and services are professionally handled. However, we reserve the right to amend the itinerary where necessary due to supplier changes, operational requirements, availability, or circumstances beyond our control.',
      'All quotes are subject to our Terms and Conditions that are to be read, understood and accepted.'
    ],
    visit: (w) => `Visit our website: ${w}`,
    eoe: 'E&OE (Errors and Omissions Excepted)',
    guest: 'Guest'
  },
  email: {
    quoteSubject: (id) => `Your Cervinia Travel Services quote — ${id}`,
    quoteBody: ({ name, total }) => ({
      greeting: `Hi ${name || 'there'},`,
      intro: `Thanks for your enquiry with Cervinia Travel Services! Here's a copy of your requested itinerary, totalling €${total}.`,
      estimate: 'This is a price estimate based on current rates — no payment has been taken. Our local team will check availability and be in touch within 24 hours to confirm everything and arrange payment.',
      bankIntro: 'Paying by bank transfer.',
      bankIntroRest: ' Once we have confirmed your booking, you can pay directly into our account — please only pay after we have confirmed:',
      attached: 'Your quote is attached to this email.',
      questions: 'Questions in the meantime? WhatsApp us any time:',
      tagline: "We don't just go there, we are there."
    }),
    ackSubject: 'We received your enquiry — Cervinia Travel Services',
    ackBody: ({ name, arrival, departure }) => ({
      greeting: `Hi ${name},`,
      body: `Thanks for getting in touch with Cervinia Travel Services! We've received your enquiry for ${arrival} to ${departure} and our local team will check availability and be in touch within 24 hours (CET) with a tailored quote.`,
      questions: 'Questions in the meantime? WhatsApp us any time:',
      tagline: "We don't just go there, we are there."
    })
  }
};

const it = {
  code: 'it',
  dateLocale: 'it-IT',
  pdf: {
    quoteRequest: 'Richiesta di preventivo',
    date: 'Data:',
    enquiryRef: 'Rif. richiesta:',
    status: 'Stato:',
    awaiting: 'In attesa di conferma',
    description: 'Descrizione',
    qty: 'Qtà',
    unitPrice: 'Prezzo unit.',
    total: 'Totale',
    subTotal: 'Subtotale',
    estimatedTotal: 'Totale stimato',
    noPayment: 'NESSUN PAGAMENTO ADDEBITATO — SOLO PREVENTIVO',
    bankOnPage2: 'Le coordinate bancarie sono a pagina 2: pagate solo dopo la nostra conferma della prenotazione.',
    thanks: 'Grazie per la vostra richiesta a Cervinia Travel Services — non ci andiamo soltanto: ci viviamo.',
    whatsapp: (n) => `Cervinia Travel Services WhatsApp: ${n}`,
    web: (w) => `Sito: ${w}`,
    whatsappShort: (n) => `WhatsApp: ${n}`,
    email: (e) => `Email: ${e}`,
    bankTitle: 'Pagamento con bonifico bancario',
    bankLabels: { accountName: 'Intestatario del conto', bank: 'Banca', account: 'Conto', iban: 'IBAN', bic: 'BIC / SWIFT', reference: 'Causale (riferimento di pagamento)' },
    bankNote: "Pagate solo dopo che il nostro team avrà confermato la disponibilità e il prezzo finale. Indicate l'intestatario del conto esattamente come riportato e riportate il riferimento di pagamento come causale.",
    exclTitle: 'ESCLUSIONI dal costo del pacchetto:',
    exclIntro: 'Quanto segue NON è incluso nel prezzo del pacchetto, salvo diversa indicazione specifica.',
    exclList: [
      'Voli aerei, tasse aeroportuali e supplementi, salvo che i voli siano espressamente inclusi.',
      'Lezioni di sci, che sono un extra facoltativo e si pagano in loco, salvo diversa indicazione.',
      'Programmi di intrattenimento, che sono extra facoltativi salvo diversa indicazione.',
      "Pasti e bevande non espressamente inclusi nell'itinerario.",
      'La tassa di soggiorno locale è da pagare direttamente in hotel al check-in, stimata in €2-€3 a persona a notte. Esenti i minori di 15 anni.',
      'Qualsiasi servizio non espressamente elencato tra le inclusioni del pacchetto.',
      'Spese personali, tra cui, a titolo esemplificativo e non esaustivo, shopping, mance e servizi aggiuntivi.',
      'Check-in anticipato e check-out posticipato, salvo che siano espressamente inclusi.',
      'Costi di passaporto e visto.',
      'Spese di corriere, ove applicabili.'
    ],
    availability: 'Questo pacchetto è soggetto a disponibilità e a variazioni delle tariffe dei fornitori. Quando siete pronti a prenotare la vostra vacanza sulla neve, contattateci per un preventivo ufficiale e per i prezzi più aggiornati.',
    docsTitle: 'Documenti di viaggio e visti',
    docsList: [
      "È necessario un passaporto valido; si raccomanda che resti valido per almeno sei (6) mesi dopo la data di rientro e che contenga almeno due (2) pagine libere, come richiesto per i viaggi internazionali.",
      'I viaggiatori sono personalmente responsabili di ottenere tutti i permessi e i visti necessari e di soddisfare tutti i requisiti di ingresso. Verificate presso le autorità competenti il rispetto delle norme prima della partenza.',
      'È responsabilità esclusiva del viaggiatore assicurarsi di soddisfare tutti i requisiti sanitari, vaccinali e di immunizzazione previsti per i viaggi internazionali.'
    ],
    estimateNote: 'Questa è una stima di prezzo, non una prenotazione confermata: il nostro team verificherà la disponibilità e vi contatterà per confermare il prezzo e concordare il pagamento.',
    importantTitle: 'Informazioni importanti',
    importantList: [
      'Qualsiasi aumento dei costi dei fornitori, inclusi, a titolo esemplificativo, hotel, compagnie aeree, transfer, tassi di cambio o servizi di viaggio correlati, può comportare un aumento del costo finale del viaggio.',
      "Cervinia Travel Services farà il possibile affinché tutta l'organizzazione e tutti i servizi siano gestiti in modo professionale. Ci riserviamo tuttavia il diritto di modificare l'itinerario ove necessario a causa di variazioni dei fornitori, esigenze operative, disponibilità o circostanze indipendenti dalla nostra volontà.",
      'Tutti i preventivi sono soggetti ai nostri Termini e Condizioni, che devono essere letti, compresi e accettati.'
    ],
    visit: (w) => `Visitate il nostro sito: ${w}`,
    eoe: 'Salvo errori e omissioni (E&OE)',
    guest: 'Ospite'
  },
  email: {
    quoteSubject: (id) => `Il vostro preventivo Cervinia Travel Services — ${id}`,
    quoteBody: ({ name, total }) => ({
      greeting: `Gentile ${name || 'cliente'},`,
      intro: `Grazie per la vostra richiesta a Cervinia Travel Services! Ecco una copia dell'itinerario richiesto, per un totale di €${total}.`,
      estimate: 'Si tratta di una stima di prezzo basata sulle tariffe attuali: non è stato addebitato alcun pagamento. Il nostro team locale verificherà la disponibilità e vi contatterà entro 24 ore per confermare tutto e concordare il pagamento.',
      bankIntro: 'Pagamento con bonifico bancario.',
      bankIntroRest: ' Una volta confermata la prenotazione, potete pagare direttamente sul nostro conto; vi preghiamo di pagare solo dopo la nostra conferma:',
      attached: 'Il vostro preventivo è allegato a questa email.',
      questions: 'Avete domande nel frattempo? Scriveteci su WhatsApp in qualsiasi momento:',
      tagline: 'Non ci andiamo soltanto: ci viviamo.'
    }),
    ackSubject: 'Abbiamo ricevuto la vostra richiesta — Cervinia Travel Services',
    ackBody: ({ name, arrival, departure }) => ({
      greeting: `Gentile ${name},`,
      body: `Grazie per aver contattato Cervinia Travel Services! Abbiamo ricevuto la vostra richiesta per il periodo dal ${arrival} al ${departure} e il nostro team locale verificherà la disponibilità e vi contatterà entro 24 ore (CET) con un preventivo su misura.`,
      questions: 'Avete domande nel frattempo? Scriveteci su WhatsApp in qualsiasi momento:',
      tagline: 'Non ci andiamo soltanto: ci viviamo.'
    })
  }
};

const packs = { en, it };
const get = (code) => packs[code] || en;
const normalise = (code) => (String(code || '').toLowerCase().startsWith('it') ? 'it' : 'en');

module.exports = { get, normalise };
