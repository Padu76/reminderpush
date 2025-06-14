let filter = 'all';
let editingDocId = null;
let reminders = [];

// STOP - Non creare dati fittizi
console.log('🔥 MODALITÀ FIRESTORE PURO - No dati locali');

// Funzioni Firestore
async function saveReminderToFirestore(reminderData) {
    try {
        console.log('💾 Salvataggio su Firestore:', reminderData);
        const docRef = await window.db.collection('reminders').add(reminderData);
        console.log('✅ Salvato con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('❌ Errore salvataggio:', error);
        alert('Errore salvataggio: ' + error.message);
        throw error;
    }
}

async function updateReminderInFirestore(docId, reminderData) {
    try {
        await window.db.collection('reminders').doc(docId).update(reminderData);
        console.log('✅ Aggiornato:', docId);
    } catch (error) {
        console.error('❌ Errore aggiornamento:', error);
        alert('Errore aggiornamento: ' + error.message);
    }
}

async function deleteReminderFromFirestore(docId) {
    try {
        await window.db.collection('reminders').doc(docId).delete();
        console.log('✅ Eliminato:', docId);
    } catch (error) {
        console.error('❌ Errore eliminazione:', error);
        alert('Errore eliminazione: ' + error.message);
    }
}

function loadRemindersFromFirestore() {
    if (!window.db) {
        console.error('❌ Database non disponibile');
        displayNoDatabase();
        return;
    }

    try {
        console.log('📡 CONNESSIONE FIRESTORE...');
        
        // Listener in tempo reale
        window.db.collection('reminders').onSnapshot((snapshot) => {
            console.log('📥 SNAPSHOT FIRESTORE - Documenti:', snapshot.size);
            
            // RESET array - Solo dati da Firestore
            reminders = [];
            
            // Carica SOLO i documenti da Firestore
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log('📄 DOCUMENTO FIRESTORE:', doc.id, data);
                
                reminders.push({
                    id: doc.id,
                    title: data.title || 'Titolo mancante',
                    description: data.description || 'Descrizione mancante',
                    deadline: data.deadline || new Date().toISOString(),
                    recipients: Array.isArray(data.recipients) ? data.recipients : [data.recipients || 'Nessun destinatario'],
                    status: data.status || '⏳ In sospeso',
                    createdAt: data.createdAt || new Date().toISOString(),
                    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString()
                });
            });
            
            // Ordina
            reminders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            console.log('🔥 FIRESTORE - Promemoria caricati:', reminders.length);
            console.log('🔥 ARRAY FINALE:', reminders);
            
            // Aggiorna interfaccia
            displayReminders();
            
        }, (error) => {
            console.error('❌ ERRORE LISTENER FIRESTORE:', error);
            alert('Errore Firestore: ' + error.message);
            displayFirestoreError();
        });
        
    } catch (error) {
        console.error('❌ ERRORE INIZIALIZZAZIONE FIRESTORE:', error);
        displayFirestoreError();
    }
}

function displayNoDatabase() {
    const list = document.getElementById('reminderList');
    list.innerHTML = '<li style="text-align: center; color: #ff4444; padding: 2rem;">❌ Database non collegato<br><small>Controlla la configurazione Firebase</small></li>';
}

function displayFirestoreError() {
    const list = document.getElementById('reminderList');
    list.innerHTML = '<li style="text-align: center; color: #ff4444; padding: 2rem;">❌ Errore Firestore<br><small>Impossibile connettersi al database</small></li>';
}

async function sendReminder() {
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const deadline = document.getElementById('deadline').value;
    const raw = document.getElementById('recipient').value.trim();
    const recipients = raw.split(',').map(r => r.trim()).filter(r => r.length > 0);

    console.log('📝 NUOVO PROMEMORIA:', { title, description, deadline, recipients });

    if (!title || !description || !deadline || recipients.length === 0) {
        alert('⚠️ Compila tutti i campi!');
        return;
    }

    if (!window.db) {
        alert('❌ Database non collegato! Controlla Firebase.');
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
        if (editingDocId) {
            // Modifica esistente
            const existing = reminders.find(r => r.id === editingDocId);
            if (existing) {
                reminderData.createdAt = existing.createdAt;
            }
            await updateReminderInFirestore(editingDocId, reminderData);
            editingDocId = null;
        } else {
            // Nuovo promemoria
            await saveReminderToFirestore(reminderData);
            
            // Invia notifiche
            const message = `Promemoria: ${title}%0ADescrizione: ${description}%0AScadenza: ${deadline}`;
            recipients.forEach((recipient, index) => {
                setTimeout(() => {
                    const isWhatsApp = /^[0-9+]+$/.test(recipient);
                    const link = isWhatsApp
                        ? `https://wa.me/${recipient}?text=${message}`
                        : `mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + "\nScadenza: " + deadline)}`;
                    
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
        console.error('❌ Errore generale:', error);
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
    
    console.log('🖥️ DISPLAY - FIRESTORE Promemoria:', reminders.length, 'Filtro:', filter);
    
    if (reminders.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #999; padding: 2rem;">📭 Nessun promemoria su Firestore<br><small>Crea il tuo primo promemoria!</small></li>';
        return;
    }

    // Applica filtri
    const filteredReminders = reminders.filter(reminder => {
        if (filter === 'pending' && reminder.status !== '⏳ In sospeso') return false;
        if (filter === 'done' && reminder.status !== '✅ Completato') return false;
        return true;
    });

    console.log('🔍 FIRESTORE Filtrati:', filteredReminders.length);

    if (filteredReminders.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #999; padding: 2rem;">🔍 Nessun promemoria per questo filtro</li>';
        return;
    }

    // Crea elementi HTML
    filteredReminders.forEach((reminder, index) => {
        const li = document.createElement('li');
        const deadlineDate = new Date(reminder.deadline);
        const createdDate = new Date(reminder.createdAt);
        const isOverdue = reminder.status === '⏳ In sospeso' && deadlineDate <= new Date();
        
        li.innerHTML = `
            <div style="border-left: 4px solid ${isOverdue ? '#ff4444' : '#25D366'}; padding-left: 1rem; background: #f9f9f9; margin: 0.5rem 0; border-radius: 4px; padding: 1rem;">
                <strong style="font-size: 1.1rem; color: ${isOverdue ? '#ff4444' : 'inherit'};">
                    🔥 ${reminder.title}
                </strong>
                <div style="margin: 0.5rem 0; color: #666;">
                    ${reminder.description}
                </div>
                <div style="font-size: 0.9rem; color: #888; margin-bottom: 0.5rem;">
                    📅 Scadenza: ${deadlineDate.toLocaleString('it-IT')} ${isOverdue ? '⚠️ SCADUTO' : ''}
                </div>
                <div style="font-size: 0.8rem; color: #aaa; margin-bottom: 0.5rem;">
                    📝 Creato: ${createdDate.toLocaleString('it-IT')}
                </div>
                <div style="font-size: 0.8rem; color: #007bff; margin-bottom: 0.5rem;">
                    🆔 ID Firestore: ${reminder.id}
                </div>
                <div style="font-size: 0.9rem; margin-bottom: 0.5rem;">
                    👥 Destinatari: ${reminder.recipients.join(', ')}
                </div>
                <div style="font-size: 0.9rem; margin-bottom: 1rem;">
                    📊 Stato: ${reminder.status}
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${reminder.status === '⏳ In sospeso' ? 
                        `<button onclick="markDone('${reminder.id}')" style="background: #25D366; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer;">✅ Completato</button>` 
                        : ''
                    }
                    <button onclick="editReminder('${reminder.id}')" style="background: #007bff; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer;">✏️ Modifica</button>
                    <button onclick="deleteReminder('${reminder.id}')" style="background: #ff4444; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer;">🗑️ Elimina</button>
                </div>
            </div>
        `;
        
        list.appendChild(li);
    });
    
    console.log('🎉 INTERFACCIA AGGIORNATA CON DATI FIRESTORE');
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
        
        document.getElementById('form').scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteReminder(docId) {
    if (confirm('🗑️ Eliminare questo promemoria da Firestore?')) {
        await deleteReminderFromFirestore(docId);
    }
}

function setFilter(f, element) {
    console.log('🔽 Cambio filtro:', filter, '→', f);
    filter = f;
    displayReminders();
    
    document.querySelectorAll('#filters button').forEach(btn => {
        btn.style.opacity = '0.7';
    });
    if (element) {
        element.style.opacity = '1';
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark");
    const current = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("theme", current);
    
    const themeButton = document.getElementById('themeToggle');
    themeButton.textContent = current === 'dark' ? '☀️' : '🌙';
}

function checkReminders() {
    const now = new Date();
    const overdue = reminders.filter(r => 
        r.status === '⏳ In sospeso' && new Date(r.deadline) <= now
    );
    
    if (overdue.length > 0) {
        if (Notification.permission === 'granted') {
            new Notification(`📌 ${overdue.length} promemoria scaduti!`, {
                icon: '📌',
                body: 'Controlla i tuoi promemoria.'
            });
        }
    }
}

// Test function
window.testFirestore = async function() {
    if (!window.db) {
        alert('❌ Database non collegato');
        return;
    }
    
    try {
        const docRef = await window.db.collection('reminders').add({
            title: 'Test FIRESTORE PURO ' + new Date().getTime(),
            description: 'Test per verificare che legga SOLO da Firestore',
            deadline: '2025-06-16T16:00',
            recipients: ['firestore@test.com'],
            status: '⏳ In sospeso',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        console.log('✅ Test FIRESTORE PURO OK - ID:', docRef.id);
        alert('✅ Test riuscito! Controlla Firebase Console per il nuovo documento.');
    } catch (error) {
        console.error('❌ Test fallito:', error);
        alert('❌ Test fallito: ' + error.message);
    }
};

// Inizializzazione
window.onload = () => {
    console.log('🚀 ReminderPush v0.7 - FIRESTORE PURO');
    
    // Tema
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        document.getElementById('themeToggle').textContent = '☀️';
    }
    
    // Firestore
    setTimeout(() => {
        if (window.db) {
            console.log('✅ FIRESTORE CONNESSO - Caricamento dati...');
            loadRemindersFromFirestore();
            console.log('🔧 Test disponibile: testFirestore()');
        } else {
            console.error('❌ FIRESTORE NON DISPONIBILE');
            displayNoDatabase();
        }
    }, 1500);
    
    setInterval(checkReminders, 60000);
    
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
};