
// Funzione per invio reminder
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
        timestamp: new Date().toISOString()
    };

    db.collection("reminders").add(reminder).then(docRef => {
        console.log("✅ Reminder salvato su Firestore con ID:", docRef.id);

        const message = `Promemoria: ${title}%0ADescrizione: ${description}%0AScadenza: ${deadline}`;
        let links = recipients.map(recipient => {
            const isWhatsApp = /^[0-9]+$/.test(recipient);
            return isWhatsApp
                ? `https://wa.me/${recipient}?text=${message}`
                : `mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + "\nScadenza: " + deadline)}`;
        }).join("\n");

        alert("Reminder salvato!\nInvia manualmente aprendo questi link:\n" + links);

        loadReminders();
    }).catch(error => {
        console.error("❌ Errore nel salvataggio su Firestore:", error);
        alert("Errore nel salvataggio su Firestore. Controlla la console per i dettagli.");
    });
}
