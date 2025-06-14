let filter = 'all';
let editingDocId = null;
let reminders = [];

// PULISCI localStorage all'avvio per evitare conflitti
localStorage.removeItem('reminders');
console.log('🧹 localStorage pulito - ora solo Firestore');

// Funzioni Firestore
async function saveReminderToFirestore(reminderData) {
    try {
        console.log('💾 Salvataggio su Firestore:', reminderData);
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
        console.log('🔄 Aggiornamento promemoria:', docId, reminderData);
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
        console.log('🗑️ Eliminazione promemoria:', docId);
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
        console.log('📡 Connessione a Firestore...');
        
        // Listener in tempo reale
        const unsubscribe = window.firestore.onSnapshot(
            window.firestore.collection(window.db, 'reminders'), 
            (snapshot) => {
                console.log('📥 Dati ricevuti da Firestore - Documenti:', snapshot.size);
                
                // Pulisci array
                reminders = [];
                
                // Carica ogni documento
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log('📄 Documento:', doc.id, data);
                    
                    // Normalizza i dati
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
                    
                    reminders.push(cleanData);
                });
                
                // Ordina per data
                reminders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                
                console.log('✅ Promemoria caricati:', reminders.length);
                console.log('📋 Lista completa:', reminders);
                
                // Aggiorna interfaccia
                displayReminders();
            }, 
            (error) => {
                console.error('❌ Errore Firestore:', error);
                alert('Errore nel collegamento a Firestore: ' + error.message);
            }
        );
        
        return unsubscribe;
    } catch (error) {
        console.error('❌ Errore nell\'inizializzare Firestore:', error);
        alert('Errore nella connessione: ' + error.message);
    }
}

async function sendReminder() {
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const deadline = document.getElementById('deadline').value;
    const raw = document.getElementById('recipient').value.trim();
    const recipients = raw.split(',').map(r => r.trim()).filter(r => r.length > 0);

    console.log('📝 Nuovo promemoria:', { title, description, deadline, recipients });

    // Validazione
    if (!title || !description || !deadline || recipients.length === 0) {
        alert('⚠️ Compila tutti i campi!');
        return;
    }

    // Verifica Firestore
    if (!window.db || !window.firestore) {
        alert('❌ Firestore non collegato!');
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
                reminderData.createdAt = existing.createdAt; // Mantieni data originale
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
        console.error('❌ Errore nel salvataggio:', error);
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
    
    console.log('🖥️ Visualizzazione - Promemoria totali:', reminders.length, 'Filtro:', filter);
    
    if (reminders.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #999; padding: 2rem;">📭 Nessun promemoria trovato<br><small>Crea il tuo primo promemoria!</small></li>';
        return;
    }

    // Applica filtri
    const filteredReminders = reminders.filter(reminder => {
        if (filter === 'pending' && reminder.status !== '⏳ In sospeso') return false;
        if (filter === 'done' && reminder.status !== '✅ Completato') return false;
        return true;
    });

    console.log('🔍 Dopo filtro:', filteredReminders.length, 'promemoria');

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
            <div style="border-left: 4px solid ${isOverdue ? '#ff4444' : '#25D366'}; padding-left: 1rem;">
                <strong style="font-size: 1.1rem; color: ${isOverdue ? '#ff4444' : 'inherit'};">
                    ${reminder.title}
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
        console.log(`✅ Elemento ${index + 1} aggiunto al DOM`);
    });
    
    console.log('🎉 Interfaccia aggiornata con', filteredReminders.length, 'promemoria');
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
    if (confirm('🗑️ Sei sicuro di voler eliminare questo promemoria?')) {
        await deleteReminderFromFirestore(docId);
    }
}

function setFilter(f, element) {
    console.log('🔽 Filtro cambiato:', filter, '→', f);
    filter = f;
    displayReminders();
    
    // Aggiorna stile bottoni
    document.querySelectorAll('#filters button').forEach(btn => {
        btn.style.opacity = '0.7';
    });
    if (element) {
        element.style.opacity = '1';
    }
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

function toggleTheme() {
    document.body.classList.toggle("dark");
    const current = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("theme", current);
    
    const themeButton = document.getElementById('themeToggle');
    themeButton.textContent = current === 'dark' ? '☀️' : '🌙';
}

// DEBUG - Funzione per testare Firestore
window.testFirestore = async function() {
    try {
        const testDoc = await window.firestore.addDoc(window.firestore.collection(window.db, 'reminders'), {
            title: 'Test da console ' + new Date().getTime(),
            description: 'Questo è un test diretto',
            deadline: '2025-06-16T14:00',
            recipients: ['console@test.com'],
            status: '⏳ In sospeso',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        console.log('✅ Test OK - ID:', testDoc.id);
        alert('Test riuscito! Nuovo promemoria creato.');
    } catch (error) {
        console.error('❌ Test fallito:', error);
        alert('Test fallito: ' + error.message);
    }
};

// Inizializzazione
window.onload = () => {
    console.log('🚀 ReminderPush v0.6 - Solo Firestore');
    
    // Tema
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        document.getElementById('themeToggle').textContent = '☀️';
    }
    
    // Firestore
    setTimeout(() => {
        if (window.db && window.firestore) {
            console.log('✅ Firebase pronto!');
            loadRemindersFromFirestore();
            console.log('🔧 Comando debug: testFirestore()');
        } else {
            console.error('❌ Firebase non trovato');
            alert('Errore: Firebase non caricato');
        }
    }, 1000);
    
    // Notifiche
    setInterval(checkReminders, 60000);
    
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
};