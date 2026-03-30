require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const { processMessage } = require('./gemini');
const { getClientByPhone } = require('./clients');
const { addMessage, getHistory } = require('./conversation');

const app = express();

// Required for Railway (sits behind a proxy) so Express sees https:// URLs
app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/**
 * Main WhatsApp webhook endpoint.
 * Twilio sends a POST here every time a client sends a WhatsApp message.
 */
app.post('/webhook', async (req, res) => {
  const from = req.body.From;
  const messageBody = req.body.Body?.trim();

  if (!from || !messageBody) {
    return res.status(400).send('Bad Request');
  }

  const phoneNumber = from.replace('whatsapp:', '');
  const twiml = new twilio.twiml.MessagingResponse();

  try {
    const client = getClientByPhone(phoneNumber);

    if (!client) {
      twiml.message("Hi there! I don't have your number on file. Please contact PACO Services directly.");
      return res.type('text/xml').send(twiml.toString());
    }

    console.log('[' + new Date().toISOString() + '] Message from ' + client.name + ': ' + messageBody);
    addMessage(phoneNumber, 'user', messageBody);
    const history = getHistory(phoneNumber);
    const reply = await processMessage(client, history);
    addMessage(phoneNumber, 'assistant', reply);
    twiml.message(reply);

  } catch (error) {
    console.error('Error processing message:', error);
    twiml.message("Sorry, I'm having a technical issue. Please try again or contact PACO Services directly.");
  }

  res.type('text/xml').send(twiml.toString());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PACO WhatsApp Bot', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('PACO Services WhatsApp Bot is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('PACO WhatsApp Bot running on port ' + PORT);
});
