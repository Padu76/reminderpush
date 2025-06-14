let filter = 'all';
let editingIndex = null;
let editingDocId = null;
let reminders = [];

// Funzioni Firestore
async function saveReminderToFirestore(reminderData) {
    try {
        const docRef = await window.firestore.addDoc(window.firestore.collection(window.db, 'reminders'), reminderData);
        console.log('Promemoria salvato con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Errore nel salvare:', error);
        alert('Errore nel salvare il promemoria');
    }
}

async function updateReminderInFirestore(docId, reminderData) {
    try {
        await window.firestore.updateDoc(window.firestore.doc(window.db, 'reminders', docId), reminderData);
        console.log('Promemoria aggiornato');
    } catch (error) {
        console.error('Errore nell\'aggiornare:', error);
        alert('Errore nell\'aggiornare il promemoria');
    }
}

async function deleteReminderFromFirestore(docId) {
    try {
        await window.firestore.deleteDoc(window.firestore.doc(window.db, 'reminders', docId));
        console.log('Promemoria eliminato');
    } catch (error) {
        console.error('Errore nell\'eliminare:', error);
        alert('Errore nell\'eliminare il promemoria');
    }
}

function loadRemindersFromFirestore() {
    // Ascolta i cambiamenti in tempo reale
    window.firestore.onSnapshot(window.firestore.collection(window.db, 'reminders'), (snapshot) => {
        reminders = [];
        snapshot.forEach((doc) => {
            reminders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        // Ordina per data di creazione (più recenti prima)
        reminders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        displayReminders();
    });
}

async function sendReminder() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const deadline = document.getElementById('deadline').value;
    const raw = document.getElementById('recipient').value;
    const recipients = raw.split(',').map(r => r.trim()).filter(r => r.length > 0);

    // Validazione input
    if (!title || !description || !deadline || recipients.length === 0) {
        alert('Compila tutti i campi!');
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
        recipients.forEach(recipient => {
            const isWhatsApp = /^[0-9+]+$/.test(recipient);
            const link = isWhatsApp
                ? `https://wa.me/${recipient}?text=${message}`
                : `mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + "\nScadenza: " + deadline)}`;
            window.open(link, '_blank');
        });
    }

    clearForm();
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
    
    if (reminders.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #999;">Nessun promemoria ancora</li>';
        return;
    }

    const filteredReminders = reminders.filter(reminder => {
        if (filter === 'pending' && reminder.status !== '⏳ In sospeso') return false;
        if (filter === 'done' && reminder.status !== '✅ Completato') return false;
        return true;
    });

    if (filteredReminders.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #999;">Nessun promemoria per questo filtro</li>';
        return;
    }

    filteredReminders.forEach((reminder, index) => {
        const li = document.createElement('li');
        const deadlineDate = new Date(reminder.deadline);
        const isOverdue = reminder.status === '⏳ In sospeso' && deadlineDate <= new Date();
        
        li.innerHTML = `
            <strong style="${isOverdue ? 'color: #ff4444;' : ''}">${reminder.title}</strong><br>
            ${reminder.description}<br>
            <small>Scadenza: ${deadlineDate.toLocaleString('it-IT')} ${isOverdue ? '⚠️ SCADUTO' : ''}</small><br>
            <small>Creato: ${new Date(reminder.createdAt).toLocaleString('it-IT')}</small><br>
            Destinatari: ${reminder.recipients.join(', ')}<br>
            Stato: ${reminder.status}<br>
            <div style="margin-top: 0.5rem;">
                ${reminder.status === '⏳ In sospeso' ? `<button onclick="markDone('${reminder.id}')">✅ Fatto</button>` : ''}
                <button onclick="editReminder('${reminder.id}')">✏️ Modifica</button>
                <button onclick="deleteReminder('${reminder.id}')" style="background: #ff4444;">🗑️ Elimina</button>
            </div>
        `;
        list.appendChild(li);
    });
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
    // Carica tema salvato
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        document.getElementById('themeToggle').textContent = '☀️';
    }
    
    // Aspetta che Firebase sia caricato
    setTimeout(() => {
        if (window.db && window.firestore) {
            loadRemindersFromFirestore();
            console.log('Firebase collegato!');
        } else {
            console.error('Firebase non caricato');
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