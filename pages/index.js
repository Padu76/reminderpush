// pages/index.js
import { useEffect, useState } from 'react';

const AIRTABLE_BASE_ID = 'app8BEPDrxSMTXVhW';
const AIRTABLE_TABLE_NAME = 'clienti';
const AIRTABLE_API_KEY = 'patyZTFa2Qxx0oFuL.39ac674a3b71b740ed22a48b1934a3dd33aaf0cd11b0d7e0254e7638f370a52e';

const airtableEndpoint = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

export default function Home() {
  const [clienti, setClienti] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [form, setForm] = useState({ Nome: '', Telefono: '', GiornoInvio: '', OrarioInvio: '', TipoMessaggio: '' });
  const [testForm, setTestForm] = useState({ nome: '', telefono: '', messaggio: '' });
  const [messaggiAI, setMessaggiAI] = useState({});
  const [storicoMessaggi, setStoricoMessaggi] = useState({});
  const [filtroGiorno, setFiltroGiorno] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [inviando, setInviando] = useState({});
  const [statusInvii, setStatusInvii] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const giorniSettimana = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
  const tipiMessaggio = ["Ordine Settimanale", "Messaggio Motivazionale", "Promemoria Appuntamento"];

  useEffect(() => {
    fetch(airtableEndpoint, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })
      .then(res => res.json())
      .then(data => setClienti(data.records || []));
  }, []);

  const handleAddCliente = async (e) => {
    e.preventDefault();
    if (!form.Nome || !form.Telefono) {
      alert('Nome e telefono sono obbligatori!');
      return;
    }

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
        setShowAddForm(false);
        alert('Cliente aggiunto con successo!');
      }
    } catch (err) {
      alert("Errore nell'aggiunta del cliente.");
    }
  };

  const handleTestMessage = async (e) => {
    e.preventDefault();
    if (!testForm.nome || !testForm.telefono || !testForm.messaggio) {
      alert('Tutti i campi sono obbligatori per il test!');
      return;
    }

    setInviando(prev => ({ ...prev, test: true }));

    try {
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testForm.telefono,
          message: testForm.messaggio,
          clienteNome: testForm.nome
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Messaggio di test inviato con successo!\nStatus: ${result.status}`);
        setTestForm({ nome: '', telefono: '', messaggio: '' });
      } else {
        alert(`❌ Errore nell'invio: ${result.details || result.error}`);
      }

    } catch (error) {
      alert(`❌ Errore: ${error.message}`);
    }

    setInviando(prev => ({ ...prev, test: false }));
  };

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
      alert("Errore nell'aggiornamento.");
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
        alert('Cliente eliminato!');
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
    setStatusInvii(prev => ({ ...prev, [clienteId]: 'Invio in corso...' }));

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
          [clienteId]: `✅ Inviato alle ${new Date().toLocaleTimeString()}` 
        }));
        
        setStoricoMessaggi(prev => ({
          ...prev,
          [clienteId]: [
            ...(prev[clienteId] || []),
            { 
              timestamp: new Date().toLocaleString(), 
              testo: messaggio,
              tipo: 'WhatsApp',
              status: result.status
            }
          ]
        }));

        await handleUpdateInline(clienteId, 'UltimoInvio', new Date().toISOString());

      } else {
        setStatusInvii(prev => ({ 
          ...prev, 
          [clienteId]: `❌ ${result.details || result.error}` 
        }));
      }

    } catch (error) {
      setStatusInvii(prev => ({ 
        ...prev, 
        [clienteId]: `❌ ${error.message}` 
      }));
    }

    setInviando(prev => ({ ...prev, [clienteId]: false }));
  };

  const handleReminderAuto = async () => {
    if (!confirm('Vuoi inviare tutti i reminder programmati per questo momento?')) return;

    try {
      const response = await fetch('/api/schedule-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Reminder inviati: ${result.messaggiInviati}\n❌ Errori: ${result.errori}`);
      }

    } catch (error) {
      alert(`Errore: ${error.message}`);
    }
  };

  const clientiFiltrati = clienti.filter(cliente => {
    const matchDay = !filtroGiorno || (cliente.fields.GiornoInvio || '').toLowerCase() === filtroGiorno.toLowerCase();
    const matchSearch = !searchTerm || 
      (cliente.fields.Nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.fields.Telefono || '').includes(searchTerm);
    return matchDay && matchSearch;
  });

  const stats = {
    totale: clienti.length,
    oggi: clienti.filter(c => {
      const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long' });
      return (c.fields.GiornoInvio || '').toLowerCase() === oggi.toLowerCase();
    }).length,
    attivi: clienti.filter(c => c.fields.GiornoInvio && c.fields.OrarioInvio).length
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: '#1f2937', fontSize: '1.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📲 ReminderPush
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: activeTab === 'dashboard' ? '#3b82f6' : 'transparent',
                color: activeTab === 'dashboard' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('clienti')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: activeTab === 'clienti' ? '#3b82f6' : 'transparent',
                color: activeTab === 'clienti' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              👥 Clienti
            </button>
            <button
              onClick={() => setActiveTab('test')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: activeTab === 'test' ? '#3b82f6' : 'transparent',
                color: activeTab === 'test' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              🧪 Test
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ color: '#1f2937', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Dashboard</h2>
            
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '2rem', color: '#3b82f6', marginBottom: '0.5rem' }}>{stats.totale}</div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Clienti Totali</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '2rem', color: '#10b981', marginBottom: '0.5rem' }}>{stats.oggi}</div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Reminder Oggi</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '0.5rem' }}>{stats.attivi}</div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Programmati</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
              <h3 style={{ color: '#1f2937', fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Azioni Rapide</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleReminderAuto}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  🚀 Invia Reminder Automatici
                </button>
                <button
                  onClick={() => setActiveTab('clienti')}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  👥 Gestisci Clienti
                </button>
                <button
                  onClick={() => setActiveTab('test')}
                  style={{
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  🧪 Testa Messaggio
                </button>
              </div>
            </div>

            {/* Setup Info */}
            <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24', padding: '1rem', borderRadius: '0.5rem' }}>
              <h4 style={{ color: '#92400e', fontWeight: '600', marginBottom: '0.5rem' }}>ℹ️ Setup Twilio WhatsApp</h4>
              <div style={{ color: '#92400e', fontSize: '0.875rem' }}>
                • <strong>Numero Twilio:</strong> +19853065498<br />
                • <strong>Per ricevere messaggi:</strong> Invia "join [codice]" al numero Twilio<br />
                • <strong>Ambiente:</strong> Sandbox (per test gratuiti)
              </div>
            </div>
          </div>
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div>
            <h2 style={{ color: '#1f2937', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>🧪 Test Messaggio WhatsApp</h2>
            
            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
              <form onSubmit={handleTestMessage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#374151', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Nome (per personalizzare il messaggio)
                  </label>
                  <input
                    type="text"
                    value={testForm.nome}
                    onChange={(e) => setTestForm(prev => ({ ...prev, nome: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem'
                    }}
                    placeholder="Es: Mario"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', color: '#374151', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Numero WhatsApp (con prefisso)
                  </label>
                  <input
                    type="text"
                    value={testForm.telefono}
                    onChange={(e) => setTestForm(prev => ({ ...prev, telefono: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem'
                    }}
                    placeholder="Es: 393123456789"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', color: '#374151', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Messaggio
                  </label>
                  <textarea
                    value={testForm.messaggio}
                    onChange={(e) => setTestForm(prev => ({ ...prev, messaggio: e.target.value }))}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      resize: 'vertical'
                    }}
                    placeholder="Scrivi il tuo messaggio di test..."
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={inviando.test}
                  style={{
                    backgroundColor: inviando.test ? '#9ca3af' : '#10b981',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: inviando.test ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {inviando.test ? '⏳ Invio in corso...' : '📲 Invia Test WhatsApp'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Clienti Tab */}
        {activeTab === 'clienti' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#1f2937', fontSize: '1.25rem', fontWeight: '600' }}>👥 Gestione Clienti</h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ➕ Aggiungi Cliente
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#1f2937', fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Nuovo Cliente</h3>
                <form onSubmit={handleAddCliente} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Nome *"
                    value={form.Nome}
                    onChange={(e) => setForm(prev => ({ ...prev, Nome: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Telefono *"
                    value={form.Telefono}
                    onChange={(e) => setForm(prev => ({ ...prev, Telefono: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                  <select
                    value={form.GiornoInvio}
                    onChange={(e) => setForm(prev => ({ ...prev, GiornoInvio: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  >
                    <option value="">Seleziona Giorno</option>
                    {giorniSettimana.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <input
                    type="time"
                    placeholder="Orario"
                    value={form.OrarioInvio}
                    onChange={(e) => setForm(prev => ({ ...prev, OrarioInvio: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                  <select
                    value={form.TipoMessaggio}
                    onChange={(e) => setForm(prev => ({ ...prev, TipoMessaggio: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  >
                    <option value="">Tipo Messaggio</option>
                    {tipiMessaggio.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Aggiungi
                  </button>
                </form>
              </div>
            )}

            {/* Filters */}
            <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Cerca per nome o telefono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    minWidth: '200px'
                  }}
                />
                <select
                  value={filtroGiorno}
                  onChange={(e) => setFiltroGiorno(e.target.value)}
                  style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                >
                  <option value="">📅 Tutti i giorni</option>
                  {giorniSettimana.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {clientiFiltrati.length} di {clienti.length} clienti
                </div>
              </div>
            </div>

            {/* Clients Grid */}
            <div style={{ display: 'grid', gap: '1rem' }}>
              {clientiFiltrati.map(cliente => (
                <div key={cliente.id} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>{cliente.fields.Nome || 'Senza nome'}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>{cliente.fields.Telefono || 'Senza telefono'}</div>
                    </div>
                    
                    <div>
                      <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Programmazione</div>
                      <div style={{ fontSize: '0.875rem' }}>
                        {cliente.fields.GiornoInvio || 'Non impostato'} {cliente.fields.OrarioInvio && `alle ${cliente.fields.OrarioInvio}`}
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Tipo</div>
                      <div style={{ fontSize: '0.875rem' }}>{cliente.fields.TipoMessaggio || 'Non impostato'}</div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          const messaggio = generaMessaggioAI(cliente);
                          setMessaggiAI(prev => ({ ...prev, [cliente.id]: messaggio }));
                        }}
                        style={{
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          padding: '0.375rem 0.75rem',
                          border: 'none',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                        title="Genera messaggio AI"
                      >
                        🧠 AI
                      </button>
                      
                      <button
                        onClick={() => handleInviaWhatsApp(cliente.id)}
                        disabled={inviando[cliente.id]}
                        style={{
                          backgroundColor: inviando[cliente.id] ? '#9ca3af' : '#10b981',
                          color: 'white',
                          padding: '0.375rem 0.75rem',
                          border: 'none',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: inviando[cliente.id] ? 'not-allowed' : 'pointer'
                        }}
                        title="Invia WhatsApp"
                      >
                        {inviando[cliente.id] ? '⏳' : '📲 Invia'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteCliente(cliente.id)}
                        style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          padding: '0.375rem 0.75rem',
                          border: 'none',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                        title="Elimina cliente"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  {messaggiAI[cliente.id] && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '0.375rem' }}>
                      <div style={{ color: '#374151', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Messaggio generato:</div>
                      <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>{messaggiAI[cliente.id]}</div>
                    </div>
                  )}
                  
                  {statusInvii[cliente.id] && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: statusInvii[cliente.id].includes('✅') ? '#10b981' : '#ef4444' }}>
                      {statusInvii[cliente.id]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {clientiFiltrati.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                <div>Nessun cliente trovato</div>
                {searchTerm || filtroGiorno ? (
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Prova a modificare i filtri di ricerca
                  </div>
                ) : (
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Aggiungi il tuo primo cliente per iniziare
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
      </main>
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
      `🔥 Hey ${nome}! Oggi è il tuo giorno per brillare! Credi in te stesso! 💫`
    ];
    return messaggiMotivazionali[Math.floor(Math.random() * messaggiMotivazionali.length)];
  } else if (tipo.includes('appuntamento')) {
    return `📅 Ciao ${nome}! Ti ricordo il nostro appuntamento di oggi. Ci vediamo presto! 😊`;
  } else {
    return `👋 Ciao ${nome}! Spero tu stia avendo una splendida giornata! 🌟`;
  }
}