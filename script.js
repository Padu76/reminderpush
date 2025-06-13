
function sendReminder() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const deadline = document.getElementById('deadline').value;
    const raw = document.getElementById('recipient').value;
    const recipients = raw.split(',').map(r => r.trim()).filter(r => r.length > 0);

    const message = `Promemoria: ${title}%0ADescrizione: ${description}%0AScadenza: ${deadline}`;

    recipients.forEach(recipient => {
        const isWhatsApp = /^[0-9]+$/.test(recipient);
        const link = isWhatsApp
            ? `https://wa.me/${recipient}?text=${message}`
            : `mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + "\nScadenza: " + deadline)}`;
        window.open(link, '_blank');
    });

    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminders.push({ title, description, deadline, recipients, status: '⏳ In sospeso' });
    localStorage.setItem('reminders', JSON.stringify(reminders));
    loadReminders();
}

function loadReminders() {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    const list = document.getElementById('reminderList');
    list.innerHTML = '';
    reminders.forEach((reminder, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${reminder.title}</strong><br>${reminder.description}<br>
        <small>Scadenza: ${reminder.deadline}</small><br>
        Destinatari: ${reminder.recipients.join(', ')}<br>
        Stato: ${reminder.status}<br>
        <button onclick="markDone(${index})">✅ Fatto</button>`;
        list.appendChild(li);
    });
}

function markDone(index) {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminders[index].status = '✅ Completato';
    localStorage.setItem('reminders', JSON.stringify(reminders));
    loadReminders();
}

window.onload = loadReminders;
