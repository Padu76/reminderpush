let filter = 'all';
let editingIndex = null;

function sendReminder() {
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

    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');

    if (editingIndex !== null) {
        reminders[editingIndex] = { 
            title, 
            description, 
            deadline, 
            recipients, 
            status: '⏳ In sospeso',
            createdAt: reminders[editingIndex].createdAt || new Date().toISOString()
        };
        editingIndex = null;
    } else {
        const newReminder = { 
            title, 
            description, 
            deadline, 
            recipients, 
            status: '⏳ In sospeso',
            createdAt: new Date().toISOString()
        };
        reminders.push(newReminder);
        
        // Invia promemoria solo per nuovi reminder (non per modifiche)
        const message = `Promemoria: ${title}%0ADescrizione: ${description}%0AScadenza: ${deadline}`;
        recipients.forEach(recipient => {
            const isWhatsApp = /^[0-9+]+$/.test(recipient);
            const link = isWhatsApp
                ? `https://wa.me/${recipient}?text=${message}`
                : `mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + "\nScadenza: " + deadline)}`;
            window.open(link, '_blank');
        });
    }

    localStorage.setItem('reminders', JSON.stringify(reminders));
    loadReminders();
    clearForm();
}

function clearForm() {
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('deadline').value = '';
    document.getElementById('recipient').value = '';
}

function loadReminders() {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    const list = document.getElementById('reminderList');
    list.innerHTML = '';
    
    if (reminders.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #999;">Nessun promemoria ancora</li>';
        return;
    }

    reminders.forEach((reminder, index) => {
        if (filter === 'pending' && reminder.status !== '⏳ In sospeso') return;
        if (filter === 'done' && reminder.status !== '✅ Completato') return;

        const li = document.createElement('li');
        const deadlineDate = new Date(reminder.deadline);
        const isOverdue = reminder.status === '⏳ In sospeso' && deadlineDate <= new Date();
        
        li.innerHTML = `
            <strong style="${isOverdue ? 'color: #ff4444;' : ''}">${reminder.title}</strong><br>
            ${reminder.description}<br>
            <small>Scadenza: ${deadlineDate.toLocaleString('it-IT')} ${isOverdue ? '⚠️ SCADUTO' : ''}</small><br>
            Destinatari: ${reminder.recipients.join(', ')}<br>
            Stato: ${reminder.status}<br>
            <div style="margin-top: 0.5rem;">
                ${reminder.status === '⏳ In sospeso' ? `<button onclick="markDone(${index})">✅ Fatto</button>` : ''}
                <button onclick="editReminder(${index})">✏️ Modifica</button>
                <button onclick="deleteReminder(${index})" style="background: #ff4444;">🗑️ Elimina</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function markDone(index) {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminders[index].status = '✅ Completato';
    reminders[index].completedAt = new Date().toISOString();
    localStorage.setItem('reminders', JSON.stringify(reminders));
    loadReminders();
}

function editReminder(index) {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    const r = reminders[index];
    document.getElementById('title').value = r.title;
    document.getElementById('description').value = r.description;
    document.getElementById('deadline').value = r.deadline;
    document.getElementById('recipient').value = r.recipients.join(', ');
    editingIndex = index;
    
    // Scroll al form
    document.getElementById('form').scrollIntoView({ behavior: 'smooth' });
}

function deleteReminder(index) {
    if (confirm('Sei sicuro di voler eliminare questo promemoria?')) {
        const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        reminders.splice(index, 1);
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
    }
}

function setFilter(f) {
    filter = f;
    loadReminders();
    
    // Aggiorna visivamente i bottoni del filtro
    document.querySelectorAll('#filters button').forEach(btn => {
        btn.style.opacity = '0.7';
    });
    event.target.style.opacity = '1';
}

function checkReminders() {
    const now = new Date();
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    let overdueCount = 0;
    
    reminders.forEach((r, i) => {
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
    
    // Carica promemoria
    loadReminders();
    
    // Avvia controllo periodico
    setInterval(checkReminders, 60000); // ogni minuto invece di 30 sec
    
    // Richiedi permessi per notifiche
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Controlla subito all'avvio
    checkReminders();
};