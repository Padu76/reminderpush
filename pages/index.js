// pages/index.js
import { useEffect, useState } from 'react';

const AIRTABLE_BASE_ID = 'app8BEPDrxSMTXVhW';
const AIRTABLE_TABLE_NAME = 'clienti';
const AIRTABLE_API_KEY = 'patyZTFa2Qxx0oFuL.39ac674a3b71b740ed22a48b1934a3dd33aaf0cd11b0d7e0254e7638f370a52e';

const airtableEndpoint = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

export default function Home() {
  const [clienti, setClienti] = useState([]);
  const [form, setForm] = useState({ Nome: '', Telefono: '', GiornoInvio: '', OrarioInvio: '', TipoMessaggio: '' });
  const [editingId, setEditingId] = useState(null);
  const [messaggiAI, setMessaggiAI] = useState({});
  const [storicoMessaggi, setStoricoMessaggi] = useState({});
  const [filtroGiorno, setFiltroGiorno] = useState('');
  const [inviando, setInviando] = useState({});
  const [statusInvii, setStatusInvii] = useState({});
  const [showTwilioInfo, setShowTwilioInfo] = useState(false);

  const giorniSettimana = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
  const tipiMessaggio = ["Ordine Settimanale", "Messaggio Motivazionale", "Promemoria Appuntamento"];

  useEffect(() => {
    fetch(airtableEndpoint, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })
      .then(res => res.json())
      .then(data => setClienti(data.records || []));
  }, []);

  const handleUpdateInline = async (id, field, value) => {
    try {
      const response = await fetch(`${airtableEndpoint}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
        body: JSON.stringify({ fields: { [field]: value } }),
      });
      const data = await response.json();
      if (data.id) {
        setClienti(prev => prev.map(c => (c.id === id ? data : c)));
      }
    } catch (err) {
      alert("Errore nell'aggiornamento inline.");
    }
  };

  const handleDeleteCliente = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo cliente?')) {
      try {
        await fetch(`${airtableEndpoint}/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
        });
        setClienti(prev => prev.filter(c => c.id !== id));
      } catch (err) {
        alert("Errore nell'eliminazione del cliente.");
      }
    }
  };

  const handleInviaWhatsApp = async (clienteId) => {
    const cliente = clienti.find(c => c.id === clienteId);
    if (!cliente) return;

    const messaggio = messaggiAI[clienteId] || generaMessaggioAI(cliente);
    const telefono = cliente.fields.Telefono;
    const nome = cliente.fields.Nome;

    if (!telefono) {
      alert('Numero di telefono mancante!');
      return;
    }

    setInviando(prev => ({ ...prev, [clienteId]: true }));
    setStatusInvii(prev => ({ ...prev, [clienteId]: 'Invio WhatsApp in corso...' }));

    try {
      const response = await fetch('/api/send-whatsapp', {
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

      const result = await response.json();

      if (response.ok) {
        setStatusInvii(prev => ({ 
          ...prev, 
          [clienteId]: `✅ WhatsApp inviato alle ${new Date().toLocaleTimeString()} - Status: ${result.status}` 
        }));
        
        // Aggiorna storico messaggi
        setStoricoMessaggi(prev => ({
          ...prev,
          [clienteId]: [
            ...(prev[clienteId] || []),
            { 
              timestamp: new Date().toLocaleString(), 
              testo: messaggio,
              tipo: 'WhatsApp Twilio',
              status: result.status,
              messageId: result.messageId
            }
          ]
        }));

        // Aggiorna ultimo invio in Airtable
        await handleUpdateInline(clienteId, 'UltimoInvio', new Date().toISOString());

      } else {
        setStatusInvii(prev => ({ 
          ...prev, 
          [clienteId]: `❌ Errore: ${result.details || result.error}` 
        }));
      }

    } catch (error) {
      setStatusInvii(prev => ({ 
        ...prev, 
        [clienteId]: `❌ Errore: ${error.message}` 
      }));
    }

    setInviando(prev => ({ ...prev, [clienteId]: false }));
  };

  const handleReminderAuto = async () => {
    try {
      const response = await fetch('/api/schedule-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Reminder WhatsApp inviati: ${result.messaggiInviati}\n❌ Errori: ${result.errori}\n⏰ Controllo: ${result.checkTime}`);
        
        // Aggiorna lo storico per i clienti che hanno ricevuto messaggi
        if (result.dettagli && result.dettagli.inviati) {
          const nuovoStorico = { ...storicoMessaggi };
          
          result.dettagli.inviati.forEach(invio => {
            const cliente = clienti.find(c => c.fields.Nome === invio.cliente);
            if (cliente) {
              nuovoStorico[cliente.id] = [
                ...(nuovoStorico[cliente.id] || []),
                {
                  timestamp: new Date(invio.timestamp).toLocaleString(),
                  testo: invio.messaggio,
                  tipo: 'WhatsApp Auto',
                  status: invio.status,
                  messageId: invio.messageId
                }
              ];
            }
          });
          
          setStoricoMessaggi(nuovoStorico);
        }
      }

    } catch (error) {
      alert(`Errore durante l'invio dei reminder: ${error.message}`);
    }
  };

  const clientiFiltrati = filtroGiorno ? clienti.filter(c => (c.fields.GiornoInvio || '').toLowerCase() === filtroGiorno.toLowerCase()) : clienti;

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', backgroundColor: '#eef7fb' }}>
      <h1 style={{ color: '#2c3e50' }}>📲 ReminderPush – WhatsApp con Twilio</h1>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ marginRight: '0.5rem' }}>📅 Filtro giorno:</label>
          <select onChange={(e) => setFiltroGiorno(e.target.value)} value={filtroGiorno}>
            <option value="">Tutti</option>
            {giorniSettimana.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleReminderAuto} 
          style={{ 
            backgroundColor: '#25D366', 
            color: 'white', 
            padding: '0.7rem 1.5rem', 
            borderRadius: '5px', 
            border: 'none',
            fontWeight: 'bold'
          }}
        >
          🚀 Invia Reminder Automatici
        </button>

        <button 
          onClick={() => setShowTwilioInfo(!showTwilioInfo)}
          style={{ 
            backgroundColor: '#3498db', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '5px', 
            border: 'none',
            fontSize: '0.9rem'
          }}
        >
          ℹ️ Info Twilio
        </button>
      </div>

      {showTwilioInfo && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d4edda', borderRadius: '5px', fontSize: '0.9rem' }}>
          <strong>📱 Configurazione Twilio WhatsApp:</strong>
          <br />• <strong>Sandbox attiva:</strong> I clienti devono inviare "join [codice]" al numero Twilio per ricevere messaggi
          <br />• <strong>Numero Twilio:</strong> +19853065498
          <br />• <strong>Variables d'ambiente:</strong> TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
          <br />• <strong>Per produzione:</strong> Verifica business account e numero WhatsApp ufficiale
        </div>
      )}

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%', backgroundColor: '#fff', borderRadius: '10px' }}>
        <thead style={{ backgroundColor: '#25D366', color: 'white' }}>
          <tr>
            <th>Nome</th>
            <th>Telefono</th>
            <th>Giorno</th>
            <th>Orario</th>
            <th>Tipo</th>
            <th>Azioni<br /><small>(🧠AI 📲WA ✏️Mod 🗑️Del)</small></th>
            <th>Messaggio</th>
            <th>Status</th>
            <th>Storico</th>
          </tr>
        </thead>
        <tbody>
          {clientiFiltrati.map(cliente => (
            <tr key={cliente.id}>
              <td>
                <input 
                  value={cliente.fields.Nome || ''} 
                  onChange={(e) => handleUpdateInline(cliente.id, 'Nome', e.target.value)} 
                  style={{ width: '100%' }} 
                />
              </td>
              <td>
                <input 
                  value={cliente.fields.Telefono || ''} 
                  onChange={(e) => handleUpdateInline(cliente.id, 'Telefono', e.target.value)} 
                  style={{ width: '100%' }}
                  placeholder="393123456789"
                />
              </td>
              <td>
                <select 
                  value={cliente.fields.GiornoInvio || ''} 
                  onChange={(e) => handleUpdateInline(cliente.id, 'GiornoInvio', e.target.value)}
                >
                  <option value="">Seleziona</option>
                  {giorniSettimana.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </td>
              <td>
                <input 
                  value={cliente.fields.OrarioInvio || ''} 
                  onChange={(e) => handleUpdateInline(cliente.id, 'OrarioInvio', e.target.value)} 
                  style={{ width: '100%' }}
                  placeholder="09:00"
                />
              </td>
              <td>
                <select 
                  value={cliente.fields.TipoMessaggio || ''} 
                  onChange={(e) => handleUpdateInline(cliente.id, 'TipoMessaggio', e.target.value)}
                >
                  <option value="">Seleziona</option>
                  {tipiMessaggio.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td>
                <button 
                  title="Genera AI" 
                  onClick={() => {
                    const messaggio = generaMessaggioAI(cliente);
                    setMessaggiAI(prev => ({ ...prev, [cliente.id]: messaggio }));
                  }}
                >
                  🧠
                </button>{' '}
                <button 
                  title="Invia WhatsApp" 
                  onClick={() => handleInviaWhatsApp(cliente.id)}
                  disabled={inviando[cliente.id]}
                  style={{ 
                    opacity: inviando[cliente.id] ? 0.5 : 1,
                    backgroundColor: inviando[cliente.id] ? '#ccc' : '#25D366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '4px 8px'
                  }}
                >
                  {inviando[cliente.id] ? '⏳' : '📲'}
                </button>{' '}
                <button title="Modifica" onClick={() => setEditingId(cliente.id)}>✏️</button>{' '}
                <button title="Elimina" onClick={() => handleDeleteCliente(cliente.id)} style={{ color: 'red' }}>🗑️</button>
              </td>
              <td style={{ maxWidth: '200px', wordWrap: 'break-word', fontSize: '0.9rem' }}>
                {messaggiAI[cliente.id]}
              </td>
              <td style={{ fontSize: '0.8rem', color: statusInvii[cliente.id]?.includes('✅') ? 'green' : 'red' }}>
                {statusInvii[cliente.id] || ''}
              </td>
              <td style={{ fontSize: '0.8rem', maxWidth: '250px' }}>
                {(storicoMessaggi[cliente.id] || []).slice(-3).map((m, i) => (
                  <div key={i} style={{ marginBottom: '4px', padding: '2px', backgroundColor: '#f8f9fa', borderRadius: '3px' }}>
                    <div style={{ fontWeight: 'bold' }}>🕒 {m.timestamp}</div>
                    <div style={{ color: '#666' }}>📱 {m.tipo} - {m.status}</div>
                    <div>📨 {m.testo.substring(0, 50)}...</div>
                    {m.messageId && <div style={{ fontSize: '0.7rem', color: '#999' }}>ID: {m.messageId.substring(0, 10)}...</div>}
                  </div>
                ))}
                {(storicoMessaggi[cliente.id] || []).length > 3 && (
                  <div style={{ fontSize: '0.7rem', color: '#666' }}>
                    ... e altri {(storicoMessaggi[cliente.id] || []).length - 3} messaggi
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function generaMessaggioAI(cliente) {
  const nome = cliente.fields.Nome || 'amico';
  const tipo = (cliente.fields.TipoMessaggio || '').toLowerCase();

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