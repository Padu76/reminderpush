// pages/api/send-whatsapp.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, message, clienteNome } = req.body;

  // Variabili d'ambiente Twilio
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(500).json({ 
      error: 'Twilio credentials not configured',
      details: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in environment variables'
    });
  }

  try {
    // Formatta numero di telefono per WhatsApp
    let formattedPhone = to.replace(/[^\d]/g, '');
    
    // Se non inizia con +39, aggiungilo (per numeri italiani)
    if (!formattedPhone.startsWith('39')) {
      formattedPhone = `39${formattedPhone}`;
    }
    
    const whatsappTo = `whatsapp:+${formattedPhone}`;

    // Crea le credenziali base64 per l'autenticazione Basic
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // Prepara i dati per Twilio (URL encoded)
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${fromNumber}`);
    formData.append('To', whatsappTo);
    formData.append('Body', message);

    console.log(`🔄 Invio WhatsApp a ${clienteNome} (${whatsappTo})`);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Messaggio WhatsApp inviato a ${clienteNome} - SID: ${data.sid}`);
      
      return res.status(200).json({
        success: true,
        messageId: data.sid,
        to: whatsappTo,
        status: data.status,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Errore Twilio API:', data);
      return res.status(400).json({
        error: 'Twilio API error',
        details: data.message || 'Unknown error',
        code: data.code || 'UNKNOWN'
      });
    }

  } catch (error) {
    console.error('❌ Errore invio WhatsApp Twilio:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
}