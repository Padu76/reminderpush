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

  const handleReminderAuto = () => {
    const aggiornati = {};
    const storico = {};
    clienti.forEach(cliente => {
      const messaggio = generaMessaggioAI(cliente);
      aggiornati[cliente.id] = messaggio;
      storico[cliente.id] = [
        ...(storicoMessaggi[cliente.id] || []),
        { timestamp: new Date().toLocaleString(), testo: messaggio }
      ];
    });
    setMessaggiAI(aggiornati);
    setStoricoMessaggi(storico);
  };

  const clientiFiltrati = filtroGiorno ? clienti.filter(c => (c.fields.GiornoInvio || '').toLowerCase() === filtroGiorno.toLowerCase()) : clienti;

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', backgroundColor: '#eef7fb' }}>
      <h1 style={{ color: '#2c3e50' }}>📲 ReminderPush – Gestione Clienti</h1>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem' }}>📅 Filtro giorno:</label>
        <select onChange={(e) => setFiltroGiorno(e.target.value)} value={filtroGiorno}>
          <option value="">Tutti</option>
          {giorniSettimana.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <button onClick={handleReminderAuto} style={{ marginBottom: '1rem', backgroundColor: '#2ecc71', color: 'white', padding: '0.5rem 1rem', borderRadius: '5px', border: 'none' }}>
        🚀 Invia Reminder Automatici
      </button>

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%', backgroundColor: '#fff', borderRadius: '10px' }}>
        <thead style={{ backgroundColor: '#2980b9', color: 'white' }}>
          <tr>
            <th>Nome</th>
            <th>Telefono</th>
            <th>Giorno</th>
            <th>Orario</th>
            <th>Tipo</th>
            <th>Azioni<br /><small>(🧠AI 📤WA ✏️Mod 🗑️Del)</small></th>
            <th>Messaggio</th>
            <th>Storico</th>
          </tr>
        </thead>
        <tbody>
          {clientiFiltrati.map(cliente => (
            <tr key={cliente.id}>
              <td>
                <input value={cliente.fields.Nome || ''} onChange={(e) => handleUpdateInline(cliente.id, 'Nome', e.target.value)} style={{ width: '100%' }} />
              </td>
              <td>
                <input value={cliente.fields.Telefono || ''} onChange={(e) => handleUpdateInline(cliente.id, 'Telefono', e.target.value)} style={{ width: '100%' }} />
              </td>
              <td>
                <select value={cliente.fields.GiornoInvio || ''} onChange={(e) => handleUpdateInline(cliente.id, 'GiornoInvio', e.target.value)}>
                  <option value="">Seleziona</option>
                  {giorniSettimana.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </td>
              <td>
                <input value={cliente.fields.OrarioInvio || ''} onChange={(e) => handleUpdateInline(cliente.id, 'OrarioInvio', e.target.value)} style={{ width: '100%' }} />
              </td>
              <td>
                <select value={cliente.fields.TipoMessaggio || ''} onChange={(e) => handleUpdateInline(cliente.id, 'TipoMessaggio', e.target.value)}>
                  <option value="">Seleziona</option>
                  {tipiMessaggio.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td>
                <button title="Genera AI" onClick={() => {
                  const messaggio = generaMessaggioAI(cliente);
                  setMessaggiAI(prev => ({ ...prev, [cliente.id]: messaggio }));
                  setStoricoMessaggi(prev => ({
                    ...prev,
                    [cliente.id]: [...(prev[cliente.id] || []), { timestamp: new Date().toLocaleString(), testo: messaggio }]
                  }));
                }}>🧠</button>{' '}
                <button title="Invia WA" onClick={() => handleReminderManuale(cliente.id)}>📤</button>{' '}
                <button title="Modifica" onClick={() => setEditingId(cliente.id)}>✏️</button>{' '}
                <button title="Elimina" onClick={() => handleDeleteCliente(cliente.id)} style={{ color: 'red' }}>🗑️</button>
              </td>
              <td>{messaggiAI[cliente.id]}</td>
              <td style={{ fontSize: '0.8rem' }}>
                {(storicoMessaggi[cliente.id] || []).map((m, i) => (
                  <div key={i} style={{ marginBottom: '4px' }}>
                    🕒 {m.timestamp}<br />📨 {m.testo}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function generaMessaggioAI(cliente) {
  let prompt = '';
  const tipo = cliente.fields.TipoMessaggio?.toLowerCase() || '';

  if (tipo.includes('allenamento')) {
    prompt = 'Scrivi un messaggio motivazionale breve per spronare una persona ad allenarsi oggi.';
  } else if (tipo.includes('ordine')) {
    prompt = 'Ricorda in modo gentile e diretto al cliente di effettuare oggi l\'ordine dei pasti.';
  } else if (tipo.includes('appuntamento')) {
    prompt = 'Invia un promemoria per ricordare un appuntamento fissato, con tono cordiale.';
  } else {
    prompt = 'Scrivi un messaggio motivazionale generico per iniziare bene la giornata.';
  }

  return `👋 Ciao ${cliente.fields.Nome || 'amico'}! ${prompt}`;
}
