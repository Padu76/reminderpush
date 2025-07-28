// autoReminder.js
const cron = require('node-cron');
const fetch = require('node-fetch');

// URL della tua app (cambia con l'URL di produzione)
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

console.log('🤖 AutoReminder avviato!');
console.log(`📡 URL app: ${APP_URL}`);

// Esegui ogni minuto per controllare i reminder
cron.schedule('* * * * *', async () => {
  const now = new Date();
  console.log(`⏰ ${now.toLocaleString('it-IT')} - Controllo reminder...`);
  
  try {
    const response = await fetch(`${APP_URL}/api/schedule-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const result = await response.json();
      
      if (result.messaggiInviati > 0) {
        console.log(`✅ ${result.messaggiInviati} messaggi inviati con successo!`);
        
        // Log dettagli messaggi inviati
        result.dettagli.inviati.forEach(msg => {
          console.log(`   📤 ${msg.cliente}: ${msg.messaggio.substring(0, 50)}...`);
        });
      }
      
      if (result.errori > 0) {
        console.log(`❌ ${result.errori} errori durante l'invio:`);
        result.dettagli.errori.forEach(err => {
          console.log(`   ⚠️  ${err.cliente}: ${err.errore}`);
        });
      }
      
      if (result.messaggiInviati === 0 && result.errori === 0) {
        // Commenta questa riga se non vuoi vedere "Nessun reminder da inviare"
        // console.log('   ℹ️  Nessun reminder da inviare in questo momento');
      }
      
    } else {
      console.error('❌ Errore chiamata API:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Errore durante il controllo reminder:', error.message);
  }
});

// Gestione graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 AutoReminder fermato');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 AutoReminder terminato');
  process.exit(0);
});

console.log('⚡ AutoReminder in esecuzione. Premi Ctrl+C per fermare.');
console.log('📋 Controllo reminder ogni minuto...');