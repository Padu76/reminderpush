
let filter = 'all';
let editingIndex = null;

function sendReminder() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const deadline = document.getElementById('deadline').value;
    const raw = document.getElementById('recipient').value;
    const recipients = raw.split(',').map(r => r.trim()).filter(r => r.length > 0);

    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');

    if (editingIndex !== null) {
        reminders[editingIndex] = { title, description, deadline, recipients, status: '⏳ In sospeso' };
        editingIndex = null;
    } else {
        reminders.push({ title, description, deadline, recipients, status: '⏳ In sospeso' });
        const message = `Promemoria: ${title}%0ADescrizione: ${description}%0AScadenza: ${deadline}`;
        recipients.forEach(recipient => {
            const isWhatsApp = /^[0-9]+$/.test(recipient);
            const link = isWhatsApp
                ? `https://wa.me/${recipient}?text=${message}`
                : `mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + "\nScadenza: " + deadline)}`;
            window.open(link, '_blank');
        });
    }

    localStorage.setItem('reminders', JSON.stringify(reminders));
    loadReminders();
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('deadline').value = '';
    document.getElementById('recipient').value = '';
}

function loadReminders() {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    const list = document.getElementById('reminderList');
    list.innerHTML = '';
    reminders.forEach((reminder, index) => {
        if (filter === 'pending' && reminder.status !== '⏳ In sospeso') return;
        if (filter === 'done' && reminder.status !== '✅ Completato') return;

        const li = document.createElement('li');
        li.innerHTML = `<strong>${reminder.title}</strong><br>${reminder.description}<br>
        <small>Scadenza: ${reminder.deadline}</small><br>
        Destinatari: ${reminder.recipients.join(', ')}<br>
        Stato: ${reminder.status}<br>
        <button onclick="markDone(${index})">✅ Fatto</button>
        <button onclick="editReminder(${index})">✏️ Modifica</button>
        <button onclick="deleteReminder(${index})">🗑️ Elimina</button>`;
        list.appendChild(li);
    });
}

function markDone(index) {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminders[index].status = '✅ Completato';
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
}

function deleteReminder(index) {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminders.splice(index, 1);
    localStorage.setItem('reminders', JSON.stringify(reminders));
    loadReminders();
}

function setFilter(f) {
    filter = f;
    loadReminders();
}

function checkReminders() {
    const now = new Date();
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminders.forEach((r, i) => {
        if (r.status === '⏳ In sospeso' && new Date(r.deadline) <= now) {
            alert(`Promemoria SCADUTO:\n${r.title}\n${r.description}`);
        }
    });
}

window.onload = () => {
    loadReminders();
    setInterval(checkReminders, 30000); // ogni 30 secondi
};

function toggleTheme() {
    document.body.classList.toggle("dark");
    const current = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("theme", current);
}

window.onload = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
    }
    loadReminders();
    setInterval(checkReminders, 30000);
};
