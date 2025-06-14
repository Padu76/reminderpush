
// Caricamento cronologia
function loadReminders(filter = "all") {
    const container = document.getElementById("reminderHistory");
    container.innerHTML = "";

    db.collection("reminders").orderBy("timestamp", "desc").get().then(snapshot => {
        snapshot.forEach(doc => {
            const data = doc.data();
            if (filter === "done" && data.status !== "✅ Fatto") return;
            if (filter === "pending" && data.status === "✅ Fatto") return;

            const card = document.createElement("div");
            card.className = "reminder-card";
            card.innerHTML = `
                <h3>${data.title}</h3>
                <p>${data.description}</p>
                <p><strong>Scadenza:</strong> ${data.deadline}</p>
                <p><strong>Destinatari:</strong> ${data.recipients.join(", ")}</p>
                <p><strong>Stato:</strong> ${data.status || "⏳ In sospeso"}</p>
                <div class="actions">
                    <button onclick="markAsDone('${doc.id}')">✅ Fatto</button>
                    <button onclick="editReminder('${doc.id}', '${data.title}', '${data.description}', '${data.deadline}', '${data.recipients.join(",")}')">✏️ Modifica</button>
                    <button onclick="deleteReminder('${doc.id}')">🗑️ Elimina</button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

// Invio promemoria e salvataggio su Firebase
function sendReminder() {
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const deadline = document.getElementById("deadline").value;
    const recipientsRaw = document.getElementById("recipients").value;

    if (!title || !description || !deadline || !recipientsRaw) {
        alert("Per favore, compila tutti i campi.");
        return;
    }

    const recipients = recipientsRaw.split(",").map(r => r.trim()).filter(r => r.length > 0);

    const reminder = {
        title,
        description,
        deadline,
        recipients,
        timestamp: new Date().toISOString(),
        status: "⏳ In sospeso"
    };

    db.collection("reminders").add(reminder).then(docRef => {
        const message = `Promemoria: ${title}%0ADescrizione: ${description}%0AScadenza: ${deadline}`;
        let links = recipients.map(recipient => {
            const isWhatsApp = /^[0-9]+$/.test(recipient);
            return isWhatsApp
                ? `https://wa.me/${recipient}?text=${message}`
                : `mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + "\nScadenza: " + deadline)}`;
        }).join("\n");

        alert("✅ Reminder salvato!\nInvia manualmente aprendo questi link:\n" + links);
        loadReminders();
    }).catch(error => {
        console.error("Errore Firebase:", error);
        alert("❌ Errore nel salvataggio.");
    });
}

// Segna come fatto
function markAsDone(id) {
    db.collection("reminders").doc(id).update({ status: "✅ Fatto" }).then(loadReminders);
}

// Modifica
function editReminder(id, title, desc, deadline, recipients) {
    document.getElementById("title").value = title;
    document.getElementById("description").value = desc;
    document.getElementById("deadline").value = deadline;
    document.getElementById("recipients").value = recipients;
    deleteReminder(id);
}

// Elimina
function deleteReminder(id) {
    db.collection("reminders").doc(id).delete().then(loadReminders);
}

// Filtro
function filterReminders(type) {
    loadReminders(type);
}

// Carica all'avvio
window.onload = () => {
    loadReminders();
};
