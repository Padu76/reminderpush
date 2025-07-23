// pages/index.js
import { useEffect, useState } from 'react';

const AIRTABLE_BASE_ID = 'app8BEPDrxSMTXVhW';
const AIRTABLE_TABLE_NAME = 'clienti';
const AIRTABLE_API_KEY = 'patyZTFa2Qxx0oFuL.39ac674a3b71b740ed22a48b1934a3dd33aaf0cd11b0d7e0254e7638f370a52e';

const airtableEndpoint = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

export default function Home() {
  const [clienti, setClienti] = useState([]);
  const [form, setForm] = useState({ Nome: '', Telefono: '', GiornoInvio: '', OrarioInvio: '', TipoMessaggio: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});

  useEffect(() => {
    fetch(airtableEndpoint, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })
      .then(res => res.json())
      .then(data => setClienti(data.records || []));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e, id) => {
    setEditingData({ ...editingData, [id]: { ...editingData[id], [e.target.name]: e.target.value } });
  };

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(airtableEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            ...form,
            UltimoInvio: null
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Errore generico');
      }

      setForm({ Nome: '', Telefono: '', GiornoInvio: '', OrarioInvio: '', TipoMessaggio: '' });
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await fetch(`${airtableEndpoint}/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      }
    });
    window.location.reload();
  };

  const handleSave = async (id) => {
    const data = editingData[id];
    if (!data) return;
    await fetch(`${airtableEndpoint}/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: data })
    });
    setEditingId(null);
    window.location.reload();
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>📲 ReminderPush – Gestione Clienti</h1>

      <div style={{ marginBottom: '1.5rem' }}>
        <input name="Nome" placeholder="Nome" value={form.Nome} onChange={handleChange} />
        <input name="Telefono" placeholder="Telefono" value={form.Telefono} onChange={handleChange} />
        <input name="GiornoInvio" placeholder="Giorno Invio" value={form.GiornoInvio} onChange={handleChange} />
        <input name="OrarioInvio" placeholder="Orario Invio" value={form.OrarioInvio} onChange={handleChange} />
        <input name="TipoMessaggio" placeholder="Tipo Messaggio" value={form.TipoMessaggio} onChange={handleChange} />
        <button onClick={handleAdd} disabled={loading}>
          {loading ? 'Aggiungendo...' : '➕ Aggiungi Cliente'}
        </button>
        {error && <p style={{ color: 'red' }}>❌ Errore: {error}</p>}
      </div>

      <table border="1" cellPadding="10" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefono</th>
            <th>Giorno Invio</th>
            <th>Orario Invio</th>
            <th>Tipo Messaggio</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {clienti.map((record) => (
            <tr key={record.id}>
              {editingId === record.id ? (
                <>
                  <td><input name="Nome" value={editingData[record.id]?.Nome || ''} onChange={(e) => handleEditChange(e, record.id)} /></td>
                  <td><input name="Telefono" value={editingData[record.id]?.Telefono || ''} onChange={(e) => handleEditChange(e, record.id)} /></td>
                  <td><input name="GiornoInvio" value={editingData[record.id]?.GiornoInvio || ''} onChange={(e) => handleEditChange(e, record.id)} /></td>
                  <td><input name="OrarioInvio" value={editingData[record.id]?.OrarioInvio || ''} onChange={(e) => handleEditChange(e, record.id)} /></td>
                  <td><input name="TipoMessaggio" value={editingData[record.id]?.TipoMessaggio || ''} onChange={(e) => handleEditChange(e, record.id)} /></td>
                  <td>
                    <button onClick={() => handleSave(record.id)}>💾 Salva</button>
                    <button onClick={() => setEditingId(null)}>❌ Annulla</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{record.fields.Nome}</td>
                  <td>{record.fields.Telefono}</td>
                  <td>{record.fields.GiornoInvio}</td>
                  <td>{record.fields.OrarioInvio}</td>
                  <td>{record.fields.TipoMessaggio}</td>
                  <td>
                    <button onClick={() => {
                      setEditingId(record.id);
                      setEditingData({ ...editingData, [record.id]: record.fields });
                    }}>✏️ Modifica</button>
                    <button onClick={() => handleDelete(record.id)}>🗑️ Elimina</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
