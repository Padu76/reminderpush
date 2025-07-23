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

  const handleUpdateCliente = async (id) => {
    try {
      const response = await fetch(`${airtableEndpoint}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
        body: JSON.stringify({ fields: form }),
      });
      const data = await response.json();
      if (data.id) {
        setClienti(prev => prev.map(c => (c.id === id ? data : c)));
        setEditingId(null);
        setForm({ Nome: '', Telefono: '', GiornoInvio: '', OrarioInvio: '', TipoMessaggio: '' });
      } else {
        alert("Errore: aggiornamento fallito.");
      }
    } catch (err) {
      alert("Errore nell'aggiornamento.");
    }
  };

  const handleDeleteCliente = async (id) => {
    if (!window.confirm("Vuoi davvero eliminare questo cliente?")) return;
    try {
      await fetch(`${airtableEndpoint}/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      });
      setClienti(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert("Errore durante l'eliminazione.");
    }
  };

  const handleReminderManuale = (clienteId) => {
    const messaggio = messaggiAI[clienteId];
    const cliente = clienti.find(c => c.id === clienteId);
    const telefono = cliente.fields.Telefono.replace(/[^0-9]/g, '');
    const link = `https://wa.me/39${telefono}?text=${encodeURIComponent(messaggio)}`;
    window.open(link, '_blank');
  };

  const handleReminderAuto = () => {
    const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long' }).toLowerCase();
    const clientiOggi = clienti.filter(c => (c.fields.GiornoInvio || '').toLowerCase() === oggi);
    clientiOggi.forEach(cliente => {
      const messaggio = generaMessaggioAI(cliente);
      const telefono = cliente.fields.Telefono.replace(/[^0-9]/g, '');
      const link = `https://wa.me/39${telefono}?text=${encodeURIComponent(messaggio)}`;
      window.open(link, '_blank');
      setStoricoMessaggi(prev => ({
        ...prev,
        [cliente.id]: [
          ...(prev[cliente.id] || []),
          { timestamp: new Date().toLocaleString(), testo: messaggio }
        ]
      }));
      setMessaggiAI(prev => ({ ...prev, [cliente.id]: messaggio }));
    });
  };

  const startEdit = (cliente) => {
    setEditingId(cliente.id);
    setForm({
      Nome: cliente.fields.Nome || '',
      Telefono: cliente.fields.Telefono || '',
      GiornoInvio: cliente.fields.GiornoInvio || '',
      OrarioInvio: cliente.fields.OrarioInvio || '',
      TipoMessaggio: cliente.fields.TipoMessaggio || '',
    });
  };

  const clientiFiltrati = filtroGiorno ? clienti.filter(c => (c.fields.GiornoInvio || '').toLowerCase() === filtroGiorno.toLowerCase()) : clienti;

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f9ff' }}>
      <h1 style={{ color: '#2c3e50' }}>📲 ReminderPush – Gestione Clienti</h1>

      <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '10px', boxShadow: '0 0 10px #ccc', marginBottom: '1rem' }}>
        <input name="Nome" placeholder="Nome" value={form.Nome} onChange={handleFormChange} style={{ marginRight: '0.5rem' }} />
        <input name="Telefono" placeholder="Telefono" value={form.Telefono} onChange={handleFormChange} style={{ marginRight: '0.5rem' }} />
        <input name="GiornoInvio" placeholder="Giorno Invio" value={form.GiornoInvio} onChange={handleFormChange} style={{ marginRight: '0.5rem' }} />
        <input name="OrarioInvio" placeholder="Orario Invio" value={form.OrarioInvio} onChange={handleFormChange} style={{ marginRight: '0.5rem' }} />
        <input name="TipoMessaggio" placeholder="Tipo Messaggio" value={form.TipoMessaggio} onChange={handleFormChange} style={{ marginRight: '0.5rem' }} />
        {editingId ? (
          <button onClick={() => handleUpdateCliente(editingId)} style={{ backgroundColor: '#3498db', color: 'white' }}>💾 Salva</button>
        ) : (
          <button onClick={handleAddCliente} style={{ backgroundColor: '#2ecc71', color: 'white' }}>➕ Aggiungi</button>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem' }}>📅 Filtro giorno:</label>
        <select onChange={(e) => setFiltroGiorno(e.target.value)} value={filtroGiorno}>
          <option value="">Tutti</option>
          <option value="Lunedì">Lunedì</option>
          <option value="Martedì">Martedì</option>
          <option value="Mercoledì">Mercoledì</option>
          <option value="Giovedì">Giovedì</option>
          <option value="Venerdì">Venerdì</option>
          <option value="Sabato">Sabato</option>
          <option value="Domenica">Domenica</option>
        </select>
      </div>

      <button onClick={handleReminderAuto} style={{ marginBottom: '1rem', backgroundColor: '#e67e22', color: 'white', padding: '0.5rem 1rem', borderRadius: '5px' }}>
        🚀 Invia Reminder Automatici
      </button>

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%', backgroundColor: '#fff', borderRadius: '10px' }}>
        <thead style={{ backgroundColor: '#3498db', color: 'white' }}>
          <tr>
            <th>Nome</th>
            <th>Telefono</th>
            <th>Giorno</th>
            <th>Orario</th>
            <th>Tipo</th>
            <th>Azioni</th>
            <th>Messaggio</th>
            <th>Storico</th>
          </tr>
        </thead>
        <tbody>
          {clientiFiltrati.map(cliente => (
            <tr key={cliente.id}>
              <td>{cliente.fields.Nome}</td>
              <td>{cliente.fields.Telefono}</td>
              <td>{cliente.fields.GiornoInvio}</td>
              <td>{cliente.fields.OrarioInvio}</td>
              <td>{cliente.fields.TipoMessaggio}</td>
              <td>
                <button onClick={() => {
                  const messaggio = generaMessaggioAI(cliente);
                  setMessaggiAI(prev => ({ ...prev, [cliente.id]: messaggio }));
                  setStoricoMessaggi(prev => ({
                    ...prev,
                    [cliente.id]: [
                      ...(prev[cliente.id] || []),
                      { timestamp: new Date().toLocaleString(), testo: messaggio }
                    ]
                  }));
                }}>🧠</button>
                <button onClick={() => handleReminderManuale(cliente.id)}>📤</button>
                <button onClick={() => startEdit(cliente)}>✏️</button>
                <button onClick={() => handleDeleteCliente(cliente.id)} style={{ color: 'red' }}>🗑️</button>
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
