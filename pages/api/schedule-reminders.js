// pages/api/schedule-reminders.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Configurazione Airtable
  const AIRTABLE_BASE_ID = 'app8BEPDrxSMTXVhW';
  const AIRTABLE_TABLE_NAME = 'clienti';
  const AIRTABLE_API_KEY = 'patyZTFa2Qxx0oFuL.39ac674a3b71b740ed22a48b1934a3dd33aaf0cd11b0d7e0254e7638f370a52e';
  const airtableEndpoint = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

  try {
    // Ottieni tutti i clienti da Airtable
    const airtableResponse = await fetch(airtableEndpoint, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const airtableData = await airtableResponse.json();
    const clienti = airtableData.records || [];

    // Ottieni giorno e ora attuali (timezone Italia)
    const now = new Date();
    const italyTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
    const currentDay = italyTime.toLocaleDateString('it-IT', { weekday: 'long' });
    const currentTime = italyTime.toTimeString().slice(0, 5); // HH:MM
    
    console.log(`🕐 Controllo reminder per ${currentDay} alle ${currentTime} (ora italiana)`);

    const messaggiInviati = [];
    const errori = [];

    // Controlla ogni cliente
    for (const cliente of clienti) {
      const fields = cliente.fields;
      const nome = fields.Nome || 'Cliente';
      const telefono = fields.Telefono;
      const giornoInvio = fields.GiornoInvio;
      const orarioInvio = fields.OrarioInvio;
      const tipoMessaggio = fields.TipoMessaggio;

      // Salta se mancano dati essenziali
      if (!telefono || !giornoInvio || !orarioInvio) {
        continue;
      }

      // Controlla se è il giorno e l'ora giusta
      const isRightDay = giornoInvio.toLowerCase() === currentDay.toLowerCase();
      const isRightTime = orarioInvio === currentTime;

      if (isRightDay && isRightTime) {
        console.log(`📅 Invio reminder WhatsApp a ${nome} (${telefono})`);

        // Genera messaggio basato sul tipo
        const messaggio = generaMessaggioPersonalizzato(nome, tipoMessaggio);

        try {
          // Invia messaggio WhatsApp tramite Twilio
          const whatsappResponse = await fetch(`${req.headers.origin || 'https://reminderpush.vercel.app'}/api/send-whatsapp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: telefono,
              message: messaggio,
              clienteNome: nome
            })
          });

          if (whatsappResponse.ok) {
            const result = await whatsappResponse.json();
            messaggiInviati.push({
              cliente: nome,
              telefono: telefono,
              messaggio: messaggio,
              messageId: result.messageId,
              status: result.status,
              timestamp: result.timestamp
            });

            // Aggiorna ultimo invio in Airtable
            await fetch(`${airtableEndpoint}/${cliente.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${AIRTABLE_API_KEY}`,
              },
              body: JSON.stringify({
                fields: {
                  UltimoInvio: now.toISOString()
                }
              }),
            });

          } else {
            const error = await whatsappResponse.json();
            errori.push({
              cliente: nome,
              telefono: telefono,
              errore: error.details || 'Errore sconosciuto'
            });
          }

        } catch (error) {
          errori.push({
            cliente: nome,
            telefono: telefono,
            errore: error.message
          });
        }
      }
    }

    console.log(`✅ Reminder WhatsApp inviati: ${messaggiInviati.length}`);
    console.log(`❌ Errori: ${errori.length}`);

    return res.status(200).json({
      success: true,
      messaggiInviati: messaggiInviati.length,
      errori: errori.length,
      dettagli: {
        inviati: messaggiInviati,
        errori: errori
      },
      checkTime: `${currentDay} ${currentTime}`,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('❌ Errore nel controllo reminder:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
}

function generaMessaggioPersonalizzato(nome, tipoMessaggio) {
  const tipo = (tipoMessaggio || '').toLowerCase();
  
  if (tipo.includes('ordine')) {
    return `👋 Ciao ${nome}! 🍽️ È ora di effettuare l'ordine dei pasti per questa settimana. Non dimenticare! 😊`;
  } else if (tipo.includes('motivazionale')) {
    const messaggiMotivazionali = [
      `💪 Ciao ${nome}! Oggi è un giorno perfetto per dare il massimo! Tu puoi farcela! 🚀`,
      `🌟 Buongiorno ${nome}! Ricorda: ogni piccolo passo ti avvicina al tuo obiettivo! 💪`,
      `☀️ Ciao ${nome}! Inizia questa giornata con energia positiva! Sei più forte di quanto pensi! ✨`,
      `🔥 Hey ${nome}! Oggi è il tuo giorno per brillare! Credi in te stesso! 💫`,
      `🌈 Ciao ${nome}! Ogni giorno è una nuova opportunità per essere la migliore versione di te! ⭐`,
      `🎯 Buongiorno ${nome}! Concentrati sui tuoi obiettivi e vedrai che li raggiungerai! 💯`
    ];
    return messaggiMotivazionali[Math.floor(Math.random() * messaggiMotivazionali.length)];
  } else if (tipo.includes('appuntamento')) {
    return `📅 Ciao ${nome}! Ti ricordo il nostro appuntamento di oggi. Ci vediamo presto! 😊`;
  } else {
    return `👋 Ciao ${nome}! Spero tu stia avendo una splendida giornata! 🌟`;
  }
}