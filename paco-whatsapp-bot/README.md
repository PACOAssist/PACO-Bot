# PACO Services — WhatsApp Bot

A Gemini-powered WhatsApp assistant that lets PACO Services clients check their project status and logged hours directly from WhatsApp.

---

## How it works

1. A client sends a WhatsApp message to your Twilio number.
2. The server identifies them by phone number.
3. Gemini fetches live data from their Trello board and Clockify, then replies in plain conversational language.

---

## Setup Guide

### 1. Clone & install

```bash
git clone <your-repo-url>
cd paco-whatsapp-bot
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in every value:

```bash
cp .env.example .env
```

Where to find each key:
- **GEMINI_API_KEY** → https://aistudio.google.com/app/apikey
- **TWILIO_ACCOUNT_SID / AUTH_TOKEN** → https://console.twilio.com (Account Info panel)
- **TWILIO_WHATSAPP_NUMBER** → Your purchased Twilio WhatsApp number, prefixed with `whatsapp:`
- **TRELLO_API_KEY / TOKEN** → https://trello.com/app-key (generate a Token on that same page)
- **CLOCKIFY_API_KEY** → Clockify → Profile Settings → API
- **CLOCKIFY_WORKSPACE_ID** → The ID in the URL when you're logged into Clockify (e.g. `app.clockify.me/tracker#/` — copy the long ID from your workspace URL)

### 3. Add your clients

Edit `data/clients.json`. Add one entry per client phone number (E.164 format):

```json
{
  "+447911123456": {
    "name": "Acme Corp",
    "trelloBoardId": "abc123",
    "clockifyClientId": "xyz789"
  }
}
```

**Finding IDs:**
- **Trello Board ID**: Open the board in Trello, add `.json` to the URL, and copy the `id` field.
- **Clockify Client ID**: In Clockify go to Clients, open the client, and copy the ID from the URL.

### 4. Deploy to Railway

1. Push this repo to GitHub.
2. Go to https://railway.app → New Project → Deploy from GitHub repo.
3. Add all your `.env` variables under **Variables** in Railway.
4. Railway will build and deploy automatically. Copy your public URL.

### 5. Configure Twilio webhook

1. Go to Twilio Console → Messaging → Senders → WhatsApp Senders.
2. Click your number → Messaging Configuration.
3. Set **"A message comes in"** webhook URL to:
   ```
   https://your-railway-url.up.railway.app/webhook
   ```
4. Method: **HTTP POST**. Save.

### 6. Test it

Send a WhatsApp message to your Twilio number from a phone number listed in `clients.json`. The bot should respond!

---

## Project structure

```
paco-whatsapp-bot/
├── src/
│   ├── index.js        # Express server & Twilio webhook handler
│   ├── gemini.js       # Gemini AI integration with function calling
│   ├── trello.js       # Trello API — board summary & recent activity
│   ├── clockify.js     # Clockify API — monthly hours summary
│   ├── clients.js      # Phone number → client lookup
│   └── conversation.js # In-memory conversation history per client
├── data/
│   └── clients.json    # Client phone number → Trello/Clockify mapping
├── .env.example
└── package.json
```

---

## Adding a new client

1. Open `data/clients.json`.
2. Add a new entry with their phone number, Trello board ID, and Clockify client ID.
3. No server restart needed — the file is re-read on every message.
