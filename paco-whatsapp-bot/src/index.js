require('dotenv').config();

const express = require('express');
const twilio = require('twilio');
const { processMessage } = require('./gemini');
const { getClientByPhone } = require('./clients');
const { addMessage, getHistory } = require('./conversation');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Twilio signature validation middleware (security)
const validateTwilio = twilio.webhook({ validate: process.env.NODE_ENV === 'production' });

/**
 * Main WhatsApp webhook endpoint.
 * Twilio sends a POST here every time a client sends a WhatsApp message.
 */
app.post('/webhook', validateTwilio, async (req, res) => {
  const from = req.body.From;   // e.g. "whatsapp:+447911123456"
  const messageBody = req.body.Body?.trim();

  if (!from || !messageBody) {
    return res.status(400).send('Bad Request');
  }

  const phoneNumber = from.replace('whatsapp:', '');
  const twiml = new twilio.twiml.MessagingResponse();

  try {
    // Look up client by phone number
    const client = getClientByPhone(phoneNumber);

    if (!client) {
      twiml.message(
        "Hi there! 👋 I don't have your number on file with PACO Services. " +
        'Please contact us directly so we can get you set up.'
      );
      return res.type('text/xml').send(twiml.toString());
    }

    console.log(`[${new Date().toISOString()}] Message from ${client.name} (${phoneNumber}): ${messageBody}`);

    // Store user message in conversation history
    addMessage(phoneNumber, 'user', messageBody);
    const history = getHistory(phoneNumber);

    // Get Claude's response
    const reply = await processMessage(client, history);

    // Store assistant reply in history
    addMessage(phoneNumber, 'assistant', reply);

    console.log(`[${new Date().toISOString()}] Reply to ${client.name}: ${reply.substring(0, 100)}...`);

    twiml.message(reply);
  } catch (error) {
    console.error('Error processing message:', error);
    twiml.message(
      "Sorry, I'm having a technical issue right now. Please try again in a moment, " +
      'or contact PACO Services directly. 🙏'
    );
  }

  res.type('text/xml').send(twiml.toString());
});

// Health check endpoint (Railway uses this)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PACO WhatsApp Bot',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.send('PACO Services WhatsApp Bot is running ✅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ PACO WhatsApp Bot running on port ${PORT}`);
  console.log(`   Webhook URL: http://localhost:${PORT}/webhook`);
});
