import { useState, useEffect } from 'react';

export default function Home() {
  const [clienti, setClienti] = useState([]);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroGiorno, setFiltroGiorno] = useState('Tutti');
  const [loading, setLoading] = useState(false);
  const [messaggioTest, setMessaggioTest] = useState('');
  const [numeroTest, setNumeroTest] = useState('');

  useEffect(() => {
    fetch('/clienti_reminderpush.csv')
      .then((res) => res.text())
      .then((data) => {
        const righe = data.split('\n').slice(1);
        const parsed = righe.map((riga) => {
          const [Nome, Telefono, GiornoInvio, OrarioInvio, TipoMessaggio] = riga.split(',');
          return { Nome, Telefono, GiornoInvio, OrarioInvio, TipoMessaggio };
        });
        setClienti(parsed.filter(c => c.Nome));
      });
  }, []);

  const handleUpdateInline = (index, field, value) => {
    const updated = [...clienti];
    updated[index][field] = value;
    setClienti(updated);
  };

  const handleInvioTest = async () => {
    if (!numeroTest || !messaggioTest) {
      alert('Inserisci numero e messaggio');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: numeroTest,
          message: messaggioTest,
          clienteNome: 'TEST'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Messaggio test inviato con successo!');
      } else {
        alert('Errore invio: ' + (data.details || ''));
      }
    } catch (err) {
      alert('Errore di rete: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clientiFiltrati = clienti.filter(cliente =>
    (filtroNome === '' || cliente.Nome.toLowerCase().includes(filtroNome.toLowerCase())) &&
    (filtroGiorno === 'Tutti' || cliente.GiornoInvio === filtroGiorno)
  );

  return (
    <div style={{ padding: '20px' }}>
      <h1>Gestione Clienti</h1>

      <input
        placeholder="Cerca per nome"
        value={filtroNome}
        onChange={(e) => setFiltroNome(e.target.value)}
        style={{ marginRight: '10px' }}
      />

      <select value={filtroGiorno} onChange={(e) => setFiltroGiorno(e.target.value)}>
        <option value="Tutti">Tutti</option>
        <option value="Lunedì">Lunedì</option>
        <option value="Martedì">Martedì</option>
        <option value="Mercoledì">Mercoledì</option>
        <option value="Giovedì">Giovedì</option>
        <option value="Venerdì">Venerdì</option>
      </select>

      <h2 style={{ marginTop: '20px' }}>Lista Clienti</h2>
      {clientiFiltrati.map((cliente, index) => (
        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input value={cliente.Nome} onChange={(e) => handleUpdateInline(index, 'Nome', e.target.value)} />
          <input value={cliente.Telefono} onChange={(e) => handleUpdateInline(index, 'Telefono', e.target.value)} />
          <select value={cliente.GiornoInvio} onChange={(e) => handleUpdateInline(index, 'GiornoInvio', e.target.value)}>
            <option value="Lunedì">Lunedì</option>
            <option value="Martedì">Martedì</option>
            <option value="Mercoledì">Mercoledì</option>
            <option value="Giovedì">Giovedì</option>
            <option value="Venerdì">Venerdì</option>
          </select>
          <input type="time" value={cliente.OrarioInvio} onChange={(e) => handleUpdateInline(index, 'OrarioInvio', e.target.value)} />
          <input value={cliente.TipoMessaggio} onChange={(e) => handleUpdateInline(index, 'TipoMessaggio', e.target.value)} />
        </div>
      ))}

      <h2 style={{ marginTop: '30px' }}>Test Messaggio WhatsApp</h2>
      <input placeholder="Numero WhatsApp" value={numeroTest} onChange={(e) => setNumeroTest(e.target.value)} />
      <textarea placeholder="Scrivi il messaggio di test..." value={messaggioTest} onChange={(e) => setMessaggioTest(e.target.value)} />
      <button onClick={handleInvioTest} disabled={loading}>
        {loading ? 'Invio...' : 'Invia Test WhatsApp'}
      </button>
    </div>
  );
}
