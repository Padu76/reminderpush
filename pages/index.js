// pages/index.js
import { useEffect, useState } from 'react';

const AIRTABLE_BASE_ID = 'app8BEPDrxSMTXVhW';
const AIRTABLE_TABLE_NAME = 'clienti';
const AIRTABLE_API_KEY = 'patyZTFa2Qxx0oFuL.39ac674a3b71b740ed22a48b1934a3dd33aaf0cd11b0d7e0254e7638f370a52e';

const airtableEndpoint = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

export default function Home() {
  const [clienti, setClienti] = useState([]);
  const [form, setForm] = useState({ Nome: '', Telefono: '', GiornoInvio: '', OrarioInvio: '', TipoMessaggio: '' });
  const [messaggiAI, setMessaggiAI] = useState({});
  const [storicoMessaggi, setStoricoMessaggi] = useState({});

  useEffect(() => {
    fetch(airtableEndpoint, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })
      .then(res => res.json())
      .then(data => setClienti(data.records || []));
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCliente = async () => {
    try {
      const response = await fetch(airtableEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
        body: JSON.stringify({ fields: form }),
      });
      const data = await response.json();
      if (data.id) {
        setClienti(prev => [...prev, data]);
        setForm({ Nome: '', Telefono: '', GiornoInvio: '', OrarioInvio: '', TipoMessaggio: '' });
      } else {
        alert("Errore: controlla che tutti i campi siano corretti.");
      }
    } catch (err) {
      alert("Errore nell'inserimento.");
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>📲 ReminderPush – Gestione Clienti</h1>

      <div style={{ marginBottom: '1rem' }}>
        <input name="Nome" placeholder="Nome" value={form.Nome} onChange={handleFormChange} style={{ marginRight: '0.5rem' }} />
        <input name="Telefono" placeholder="Telefono" value={form.Telefono} onChange={handleFormChange} style={{ marginRight: '0.5rem' }} />
        <input name="GiornoInvio" placeholder="Giorno Invio" value={form.GiornoInvio} onChange={handleFormChange} style={{ marginRight: '0.5rem' }} />
        <input name="OrarioInvio" placeholder="Orario Invio" value={form.OrarioInvio} onChange={handleFormChange} style={{ marginRight: '0.5rem' }} />
        <input name="TipoMessaggio" placeholder="Tipo Messaggio" value={form.TipoMessaggio} onChange={handleFormChange} style={{ marginRight: '0.5rem' }} />
        <button onClick={handleAddCliente}>➕ Aggiungi Cliente</button>
      </div>

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefono</th>
            <th>Giorno</th>
            <th>Orario</th>
            <th>Tipo Messaggio</th>
            <th>Azioni</th>
            <th>Messaggio AI</th>
            <th>Storico</th>
          </tr>
        </thead>
        <tbody>
          {clienti.map(cliente => (
            <tr key={cliente.id}>
              <td>{cliente.fields.Nome}</td>
              <td>{cliente.fields.Telefono}</td>
              <td>{cliente.fields.GiornoInvio}</td>
              <td>{cliente.fields.OrarioInvio}</td>
              <td>{cliente.fields.TipoMessaggio}</td>
              <td>
                <button onClick={() => generaMessaggioAI(cliente)}>🧠 Genera AI</button>
              </td>
              <td>{messaggiAI[cliente.id]}</td>
              <td>
                {(storicoMessaggi[cliente.id] || []).map((m, i) => (
                  <div key={i} style={{ marginBottom: '4px', fontSize: '0.8rem' }}>
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

  const messaggio = `👋 Ciao ${cliente.fields.Nome || 'amico'}! ${prompt}`;
  const now = new Date().toLocaleString();

  return messaggio;
}
