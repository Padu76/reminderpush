// pages/index.js
import { useEffect, useState } from 'react';
import Papa from 'papaparse';

export default function Home() {
  const [clienti, setClienti] = useState([]);
  const [messaggio, setMessaggio] = useState('Ciao! Ricordati di ordinare i tuoi pasti questa settimana 😊');

  useEffect(() => {
    fetch('/clienti_reminderpush.csv')
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          complete: (results) => setClienti(results.data)
        });
      });
  }, []);

  const generaLinkWA = (numero, nome) => {
    const testo = encodeURIComponent(messaggio.replace('{nome}', nome));
    return `https://wa.me/39${numero}?text=${testo}`;
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>📲 ReminderPush Dashboard</h1>
      <textarea
        value={messaggio}
        onChange={(e) => setMessaggio(e.target.value)}
        rows={4}
        style={{ width: '100%', margin: '1rem 0', fontSize: '1rem' }}
      />
      <table border="1" cellPadding="10" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefono</th>
            <th>Tipo Messaggio</th>
            <th>Invia</th>
          </tr>
        </thead>
        <tbody>
          {clienti.map((cliente, i) => (
            <tr key={i}>
              <td>{cliente.Nome}</td>
              <td>{cliente.Telefono}</td>
              <td>{cliente.TipoMessaggio}</td>
              <td>
                <a
                  href={generaLinkWA(cliente.Telefono, cliente.Nome)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📤 Invia
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 

// public/clienti_reminderpush.csv
// (Da caricare nella cartella pubblica per leggere i dati CSV dalla webapp)
