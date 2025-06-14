let filter = 'all';
let editingIndex = null;
let editingDocId = null;
let reminders = [];

// DEBUG - Funzione di test per Firestore
window.testFirestore = async function() {
    try {
        console.log('Inizio test Firestore...');
        const testDoc = await window.firestore.addDoc(window.firestore.collection(window.db, 'reminders'), {
            title: 'Test diretto da console',
            description: 'Test per verificare connessione Firestore',
            deadline: '2025-06-15T12:00',
            recipients: ['test@test.com'],
            status: '⏳ In sospeso',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        console.log('✅ Test Firestore OK - ID:', testDoc.id);
        alert('Test riuscito! Controlla Firebase Console.');
    } catch (error) {
        console.error('❌ Test Firestore FAILED:', error);
        alert('Test fallito: ' + error.message);
    }
};

// DEBUG - Mostra struttura dati
window.debugData = function() {
    console.log('=== DEBUG DATI ===');
    console.log('Array reminders:', reminders);
    console.log('Lunghezza array:', reminders.length);
    console.log('Filtro attuale:', filter);
    
    reminders.forEach((reminder, index) => {
        console.log(`Promemoria ${index}:`, {
            id: reminder.id,
            title: reminder.title,
            status: reminder.status,
            recipients: reminder.recipients,
            createdAt: reminder.createdAt
        });
    });
};

// Funzioni Firestore
async function saveReminderToFirestore(reminderData) {
    try {
        console.log('Tentativo salvataggio:', reminderData);
        const docRef = await window.firestore.addDoc(window.firestore.collection(window.db, 'reminders'), reminderData);
        console.log('✅ Promemoria salvato con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('❌ Errore nel salvare:', error);
        alert('Errore nel salvare il promemoria: ' + error.message);
        throw error;
    }
}

async function updateReminderInFirestore(docId, reminderData) {
    try {
        console.log('Aggiornamento promemoria:', docId, reminderData);
        await window.firestore.updateDoc(window.firestore.doc(window.db, 'reminders', docId), reminderData);
        console.log('✅ Promemoria aggiornato');
    } catch (error) {
        console.error('❌ Errore nell\'aggiornare:', error);
        alert('Errore nell\'aggiornare il promemoria: ' + error.message);
        throw error;
    }
}

async function deleteReminderFromFirestore(docId) {
    try {
        console.log('Eliminazione promemoria:', docId);
        await window.firestore.deleteDoc(window.firestore.doc(window.db, 'reminders', docId));
        console.log('✅ Promemoria eliminato');
    } catch (error) {
        console.error('❌ Errore nell\'eliminare:', error);
        alert('Errore nell\'eliminare il promemoria: ' + error.message);
        throw error;
    }
}

function loadRemindersFromFirestore() {
    try {
        console.log('Caricamento promemoria da Firestore...');
        // Ascolta i cambiamenti in tempo reale
        window.firestore.onSnapshot(window.firestore.collection(window.db, 'reminders'), (snapshot) => {
            console.log('📥 Snapshot ricevuto - Documenti:', snapshot.size);
            reminders = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log('RAW Documento:', doc.id, data);
                
                // Pulisci e standardizza i dati
                const cleanData = {
                    id: doc.id,
                    title: data.title || 'Titolo mancante',
                    description: data.description || 'Descrizione mancante',
                    deadline: data.deadline || new Date().toISOString(),
                    recipients: Array.isArray(data.recipients) ? data.recipients : [data.recipients || 'Nessun destinatario'],
                    status: data.status || '⏳ In sospeso',
                    createdAt: data.createdAt || new Date().toISOString(),
                    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString()
                };
                
                console.log('CLEAN Documento:', cleanData);
                reminders.push(cleanData);
            });
            
            // Ordina per data di creazione (più recenti prima)
            reminders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            console.log('✅ Promemoria caricati e ordinati:', reminders.length);
            
            // Debug finale
            console.log('Array finale reminders:', reminders);
            
            displayReminders();
        }, (error) => {
            console.error('❌ Errore nel caricamento:', error);
            alert('Errore nel caricare i promemoria: ' + error.message);
        });
    } catch (error) {
        console.error('❌ Errore nell\'inizializzare il listener:', error);
        alert('Errore nella connessione a Firestore: ' + error.message);
    }
}

async function sendReminder() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const deadline = document.getElementById('deadline').value;
    const raw = document.getElementById('recipient').value;
    const recipients = raw.split(',').map(r => r.trim()).filter(r => r.length > 0);

    console.log('📝 Creazione promemoria:', { title, description, deadline, recipients });

    // Validazione input
    if (!title || !description || !deadline || recipients.length === 0) {
        alert('Compila tutti i campi!');
        return;
    }

    // Verifica connessione Firestore
    if (!window.db || !window.firestore) {
        alert('Errore: Firestore non è collegato!');
        console.error('❌ Firestore non disponibile');
        return;
    }

    const reminderData = {
        title,
        description,
        deadline,
        recipients,
        status: '⏳ In sospeso',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        if (editingDocId !== null) {
            // Modifica promemoria esistente
            reminderData.createdAt = reminders.find(r => r.id === editingDocId).createdAt; // Mantieni data originale
            await updateReminderInFirestore(editingDocId, reminderData);
            editingDocId = null;
            editingIndex = null;
        } else {
            // Nuovo promemoria
            await saveReminderToFirestore(reminderData);
            
            // Invia promemoria solo per nuovi reminder
            const message = `Promemoria: ${title}%0ADescrizione: ${description}%0AScadenza: ${deadline}`;
            recipients.forEach((recipient, index) => {
                setTimeout(() => {
                    const isWhatsApp = /^[0-9+]+$/.test(recipient);
                    const link = isWhatsApp
                        ? `https://wa.me/${recipient}?text=${message}`
                        : `mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + "\nScadenza: " + deadline)}`;
                    
                    // Usa location.href per il primo link, window.open per gli altri
                    if (index === 0) {
                        window.location.href = link;
                    } else {
                        setTimeout(() => window.open(link, '_blank'), 1000 * index);
                    }
                }, 500 * index);
            });
        }

        clearForm();
    } catch (error) {
        console.error('❌ Errore generale nel sendReminder:', error);
    }
}

function clearForm() {
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('deadline').value = '';
    document.getElementById('recipient').value = '';
}

function displayReminders() {
    const list = document.getElementById('reminderList');
    list.innerHTML = '';
    
    console.log('🖥️ DISPLAY - Inizio visualizzazione');
    console.log('🖥️ DISPLAY - Array reminders:', reminders);
    console.log('🖥️ DISPLAY - Lunghezza array:', reminders.length);
    console.log('🖥️ DISPLAY - Filtro attuale:', filter);
    
    if (reminders.length === 0) {
        const msg = '<li style="text-align: center; color: #999;">Nessun promemoria ancora - Array vuoto</li>';
        console.log('🖥️ DISPLAY - Mostrando:', msg);
        list.innerHTML = msg;
        return;
    }

    const filteredReminders = reminders.filter(reminder => {
        if (filter === 'pending' && reminder.status !== '⏳ In sospeso') return false;
        if (filter === 'done' && reminder.status !== '✅ Completato') return false;
        return true;
    });

    console.log('🖥️ DISPLAY - Promemoria filtrati:', filteredReminders.length);
    console.log('🖥️ DISPLAY - Lista filtrata:', filteredReminders);

    if (filteredReminders.length === 0) {
        const msg = '<li style="text-align: center; color: #999;">Nessun promemoria per questo filtro</li>';
        console.log('🖥️ DISPLAY - Filtro vuoto, mostrando:', msg);
        list.innerHTML = msg;
        return;
    }

    console.log('🖥️ DISPLAY - Creazione elementi HTML...');
    filteredReminders.forEach((reminder, index) => {
        console.log(`🖥️ DISPLAY - Elemento ${index}:`, reminder);
        
        const li = document.createElement('li');
        const deadlineDate = new Date(reminder.deadline);
        const isOverdue = reminder.status === '⏳ In sospeso' && deadlineDate <= new Date();
        
        li.innerHTML = `
            <strong style="${isOverdue ? 'color: #ff4444;' : ''}">${reminder.title}</strong><br>
            ${reminder.description}<br>
            <small>Scadenza: ${deadlineDate.toLocaleString('it-IT')} ${isOverdue ? '⚠️ SCADUTO' : ''}</small><br>
            <small>Creato: ${new Date(reminder.createdAt).toLocaleString('it-IT')}</small><br>
            <small>ID: ${reminder.id}</small><br>
            Destinatari: ${reminder.recipients.join(', ')}<br>
            Stato: ${reminder.status}<br>
            <div style="margin-top: 0.5rem;">
                ${reminder.status === '⏳ In sospeso' ? `<button onclick="markDone('${reminder.id}')">✅ Fatto</button>` : ''}
                <button onclick="editReminder('${reminder.id}')">✏️ Modifica</button>
                <button onclick="deleteReminder('${reminder.id}')" style="background: #ff4444;">🗑️ Elimina</button>
                <button onclick="debugData()" style="background: #007bff;">🔍 Debug</button>
            </div>
        `;
        list.appendChild(li);
    });
    
    console.log('🖥️ DISPLAY - HTML creato e aggiunto al DOM');
}

async function markDone(docId) {
    const reminder = reminders.find(r => r.id === docId);
    if (reminder) {
        await updateReminderInFirestore(docId, {
            ...reminder,
            status: '✅ Completato',
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
}

function editReminder(docId) {
    const reminder = reminders.find(r => r.id === docId);
    if (reminder) {
        document.getElementById('title').value = reminder.title;
        document.getElementById('description').value = reminder.description;
        document.getElementById('deadline').value = reminder.deadline;
        document.getElementById('recipient').value = reminder.recipients.join(', ');
        editingDocId = docId;
        
        // Scroll al form
        document.getElementById('form').scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteReminder(docId) {
    if (confirm('Sei sicuro di voler eliminare questo promemoria?')) {
        await deleteReminderFromFirestore(docId);
    }
}

function setFilter(f, element) {
    console.log('🔽 Cambio filtro da', filter, 'a', f);
    filter = f;
    displayReminders();
    
    // Aggiorna visualmente i bottoni del filtro
    document.querySelectorAll('#filters button').forEach(btn => {
        btn.style.opacity = '0.7';
    });
    if (element) {
        element.style.opacity = '1';
    }
}

function checkReminders() {
    const now = new Date();
    let overdueCount = 0;
    
    reminders.forEach((r) => {
        if (r.status === '⏳ In sospeso' && new Date(r.deadline) <= now) {
            overdueCount++;
        }
    });
    
    // Mostra notifica solo se ci sono reminder scaduti
    if (overdueCount > 0) {
        if (Notification.permission === 'granted') {
            new Notification(`Hai ${overdueCount} promemoria scaduti!`, {
                icon: '📌',
                body: 'Controlla i tuoi promemoria.'
            });
        } else {
            // Fallback per browser che non supportano notifiche
            const overdue = reminders.filter(r => r.status === '⏳ In sospeso' && new Date(r.deadline) <= now);
            if (overdue.length > 0) {
                alert(`⚠️ Hai ${overdue.length} promemoria scaduti:\n${overdue.map(r => r.title).join('\n')}`);
            }
        }
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark");
    const current = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("theme", current);
    
    // Cambia l'icona del tema
    const themeButton = document.getElementById('themeToggle');
    themeButton.textContent = current === 'dark' ? '☀️' : '🌙';
}

// Inizializzazione quando la pagina è caricata
window.onload = () => {
    console.log('🚀 Inizializzazione app...');
    
    // Carica tema salvato
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        document.getElementById('themeToggle').textContent = '☀️';
    }
    
    // Aspetta che Firebase sia caricato
    setTimeout(() => {
        if (window.db && window.firestore) {
            console.log('✅ Firebase collegato!');
            loadRemindersFromFirestore();
            
            // Esponi le funzioni di test
            console.log('🔧 Funzioni debug disponibili:');
            console.log('  - testFirestore() - Test connessione');
            console.log('  - debugData() - Mostra struttura dati');
        } else {
            console.error('❌ Firebase non caricato');
            alert('Errore nel collegamento al database');
        }
    }, 1000);
    
    // Avvia controllo periodico
    setInterval(checkReminders, 60000); // ogni minuto
    
    // Richiedi permessi per notifiche
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
};