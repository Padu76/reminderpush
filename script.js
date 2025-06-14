
const firebaseConfig = {
  apiKey: "AIzaSyC-s8vUHiXn2mWvUynFa7eY4jr9LHC5LQ",
  authDomain: "reminderpush.firebaseapp.com",
  projectId: "reminderpush",
  storageBucket: "reminderpush.appspot.com",
  messagingSenderId: "533477709060",
  appId: "1:533477709060:web:94d90a7e327ec2912d1a05",
  measurementId: "G-RZ3Y5EV1DX"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let filter = 'all';
let editingId = null;

function sendReminder() {
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const deadline = document.getElementById('deadline').value;
    const raw = document.getElementById('recipient').value;
    const recipients = raw.split(',').map(r => r.trim()).filter(r => r.length > 0);

    if (!title || !description || recipients.length === 0) {
        alert("Compila tutti i campi prima di inviare il promemoria.");
        return;
    }

    const reminder = { title, description, deadline, recipients, status: '⏳ In sospeso' };

    if (editingId) {
        db.collection("reminders").doc(editingId).set(reminder).then(() => {
            editingId = null;
            loadReminders();
        });
    } else {
        
    db.collection("reminders").add(reminder).then(() => {
        console.log("Reminder salvato su Firestore:", reminder);
    
            const message = `Promemoria: ${title}%0ADescrizione: ${description}%0AScadenza: ${deadline}`;
            recipients.forEach(recipient => {
                const isWhatsApp = /^[0-9]+$/.test(recipient);
                const link = isWhatsApp
                    ? `https://wa.me/${recipient}?text=${message}`
                    : `mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + "\nScadenza: " + deadline)}`;
                window.open(link, '_blank');
            });
            loadReminders();
        });
    }

    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('deadline').value = '';
    document.getElementById('recipient').value = '';
}

function loadReminders() {
    db.collection("reminders").get().then(snapshot => {
        const list = document.getElementById('reminderList');
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const reminder = doc.data();

            if (!Array.isArray(reminder.recipients)) return;

            if (filter === 'pending' && reminder.status !== '⏳ In sospeso') return;
            if (filter === 'done' && reminder.status !== '✅ Completato') return;

            const li = document.createElement('li');
            li.innerHTML = `<strong>${reminder.title}</strong><br>${reminder.description}<br>
            <small>Scadenza: ${reminder.deadline}</small><br>
            Destinatari: ${reminder.recipients.join(', ')}<br>
            Stato: ${reminder.status}<br>
            <button onclick="markDone('${doc.id}')">✅ Fatto</button>
            <button onclick="editReminder('${doc.id}')">✏️ Modifica</button>
            <button onclick="deleteReminder('${doc.id}')">🗑️ Elimina</button>`;
            list.appendChild(li);
        });
    });
}

function markDone(id) {
    db.collection("reminders").doc(id).update({ status: '✅ Completato' }).then(loadReminders);
}

function editReminder(id) {
    db.collection("reminders").doc(id).get().then(doc => {
        const r = doc.data();
        document.getElementById('title').value = r.title;
        document.getElementById('description').value = r.description;
        document.getElementById('deadline').value = r.deadline;
        document.getElementById('recipient').value = r.recipients.join(', ');
        editingId = id;
    });
}

function deleteReminder(id) {
    db.collection("reminders").doc(id).delete().then(loadReminders);
}

function setFilter(f) {
    filter = f;
    loadReminders();
}

function toggleTheme() {
    document.body.classList.toggle("dark");
    const current = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("theme", current);
}

window.onload = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") document.body.classList.add("dark");
    loadReminders();
    setInterval(() => loadReminders(), 30000);
};
