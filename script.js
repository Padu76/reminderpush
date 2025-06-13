
function sendReminder() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const deadline = document.getElementById('deadline').value;
    const recipient = document.getElementById('recipient').value;
    const isWhatsApp = /^[0-9]+$/.test(recipient);

    let message = `Promemoria: ${title}%0ADescrizione: ${description}%0AScadenza: ${deadline}`;
    let link = isWhatsApp 
        ? `https://wa.me/${recipient}?text=${message}` 
        : `mailto:${recipient}?subject=${title}&body=${description}%0AScadenza: ${deadline}`;

    window.open(link, '_blank');

    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    reminders.push({ title, description, deadline, recipient, status: '⏳ In sospeso' });
    localStorage.setItem('reminders', JSON.stringify(reminders));
    loadReminders();
}

function loadReminders() {
    const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
    const list = document.getElementById('reminderList');
    list.innerHTML = '';
    reminders.forEach((reminder, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${reminder.title}</strong><br>${reminder.description}<br><small>Scadenza: ${reminder.deadline}</small><br>Destinatario: ${reminder.recipient}<br><button onclick="markDone(${index})">✅ Fatto</button>`;
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
