// pages/api/send-whatsapp.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, message, clienteNome } = req.body;

  // Variabili d'ambiente necessarie
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return res.status(500).json({ 
      error: 'WhatsApp credentials not configured',
      details: 'Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment variables'
    });
  }

  try {
    // Formatta numero di telefono (rimuovi spazi, trattini, etc.)
    const formattedPhone = to.replace(/[^\d]/g, '');
    
    // Se non inizia con +39, aggiungilo (per numeri italiani)
    const finalPhone = formattedPhone.startsWith('39') ? formattedPhone : `39${formattedPhone}`;

    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: finalPhone,
      type: "text",
      text: {
        body: message
      }
    };

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload)
    });

    const data = await response.json();

    if (response.ok) {
      // Log invio nel database o file
      console.log(`✅ Messaggio inviato a ${clienteNome} (${finalPhone}):`, message);
      
      return res.status(200).json({
        success: true,
        messageId: data.messages[0].id,
        to: finalPhone,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Errore WhatsApp API:', data);
      return res.status(400).json({
        error: 'WhatsApp API error',
        details: data.error?.message || 'Unknown error'
      });
    }

  } catch (error) {
    console.error('❌ Errore invio WhatsApp:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
}