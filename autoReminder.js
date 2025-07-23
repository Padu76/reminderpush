const fetch = require('node-fetch');
const open = require('open');

const API_KEY = 'patyZTFa2Qxx0oFuL.39ac674a3b71b740ed22a48b1934a3dd33aaf0cd11b0d7e0254e7638f370a52e';
const BASE_ID = 'app8BEPDrxSMTXVhW';
const TABLE_NAME = 'clienti';

const giorni = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];

function generaMessaggio(cliente) {
  const tipo = cliente.fields.TipoMessaggio?.toLowerCase() || '';
  let testo = '';

  if (tipo.includes('allenamento')) {
    testo = 'Scrivi un messaggio motivazionale breve per spronare una persona ad allenarsi oggi.';
  } else if (tipo.includes('ordine')) {
    testo = 'Ricorda in modo gentile e diretto al cliente di effettuare oggi l\'ordine dei pasti.';
  } else if (tipo.includes('appuntamento')) {
    testo = 'Invia un promemoria per ricordare un appuntamento fissato, con tono cordiale.';
  } else {
    testo = 'Scrivi un messaggio motivazionale generico per iniziare bene la giornata.';
  }

  return `👋 Ciao ${cliente.fields.Nome || 'amico'}! ${testo}`;
}

async function checkReminder() {
  const now = new Date();
  const giornoCorrente = giorni[now.getDay()];
  const orarioCorrente = now.toTimeString().slice(0, 5); // es. "16:00"

  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`
    }
  });

  const data = await res.json();
  const clienti = data.records || [];

  clienti.forEach(cliente => {
    const { GiornoInvio, OrarioInvio, Telefono } = cliente.fields;

    if (GiornoInvio === giornoCorrente && OrarioInvio === orarioCorrente) {
      const messaggio = encodeURIComponent(generaMessaggio(cliente));
      const numero = Telefono.replace(/\D/g, '');
      const url = `https://wa.me/39${numero}?text=${messaggio}`;
      console.log(`✅ Inviando a ${cliente.fields.Nome}: ${url}`);
      open(url);
    }
  });
}

checkReminder();
