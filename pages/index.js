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
  const [motivationalLinks, setMotivationalLinks] = useState({});
  const [showOnlyToday, setShowOnlyToday] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [messaggiAI, setMessaggiAI] = useState({});
  const [storicoMessaggi, setStoricoMessaggi] = useState({});

  useEffect(() => {
    fetch(airtableEndpoint, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })
      .then(res => res.json())
      .then(data => setClienti(data.records || []));
  }, []);

  const getTodayWeekday = () => {
    const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    return giorni[new Date().getDay()];
  };

  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const generaMessaggioAI = (cliente) => {
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
    setMessaggiAI(prev => ({ ...prev, [cliente.id]: messaggio }));
    setStoricoMessaggi(prev => ({
      ...prev,
      [cliente.id]: [...(prev[cliente.id] || []), { testo: messaggio, timestamp: now }]
    }));
    return messaggio;
  };

  const inviaReminderAutomatici = async () => {
    const oggi = getTodayWeekday();
    const oggiData = getTodayDateString();
    const daInviare = clienti.filter(c =>
      c.fields.GiornoInvio?.toLowerCase() === oggi &&
      c.fields.UltimoInvio !== oggiData
    );

    for (const cliente of daInviare) {
      const messaggio = generaMessaggioAI(cliente);
      const numero = cliente.fields.Telefono?.replace(/[^\d]/g, '');
      if (numero) {
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(messaggio)}`;
        window.open(url, '_blank');

        await fetch(`${airtableEndpoint}/${cliente.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          },
          body: JSON.stringify({
            fields: { UltimoInvio: oggiData },
          }),
        });
      }
    }
    alert(`✅ Reminder inviati a ${daInviare.length} clienti.`);
  };

  const clientiFiltrati = clienti.filter(c => {
    const giornoOggi = getTodayWeekday();
    const ultimoInvio = c.fields.UltimoInvio || '';
    const passaGiorno = !showOnlyToday || (
      c.fields.GiornoInvio?.toLowerCase() === giornoOggi &&
      ultimoInvio !== getTodayDateString()
    );
    const passaFiltroTipo = !filtroTipo || c.fields.TipoMessaggio?.toLowerCase().includes(filtroTipo.toLowerCase());
    return passaGiorno && passaFiltroTipo;
  });

  const totaleClienti = clienti.length;
  const daContattareOggi = clienti.filter(c =>
    c.fields.GiornoInvio?.toLowerCase() === getTodayWeekday() &&
    c.fields.UltimoInvio !== getTodayDateString()
  ).length;
  const giaContattatiOggi = clienti.filter(c =>
    c.fields.GiornoInvio?.toLowerCase() === getTodayWeekday() &&
    c.fields.UltimoInvio === getTodayDateString()
  ).length;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>📲 ReminderPush – Gestione Clienti</h1>

      <div style={{ marginBottom: '1rem', background: '#f3f3f3', padding: '1rem', borderRadius: '8px' }}>
        <strong>📊 Statistiche:</strong><br />
        👥 Totali: <strong>{totaleClienti}</strong> – 📬 Da inviare oggi: <strong>{daContattareOggi}</strong> – ✅ Già inviati: <strong>{giaContattatiOggi}</strong> {filtroTipo && <>– 🎯 Tipo selezionato: <strong>{filtroTipo}</strong></>}
      </div>

      <button onClick={inviaReminderAutomatici} style={{ marginBottom: '1rem', padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
        📤 Invia Reminder Automatici
      </button>

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
          {clientiFiltrati.map(cliente => (
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
