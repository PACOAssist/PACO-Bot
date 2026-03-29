const path = require('path');
const fs = require('fs');

const clientsFilePath = path.join(__dirname, '..', 'data', 'clients.json');

/**
 * Look up a client by their WhatsApp phone number.
 * Phone numbers in clients.json should be in E.164 format (e.g. "+447911123456").
 *
 * @param {string} phoneNumber - e.g. "+447911123456"
 * @returns {object|null} client record or null if not found
 */
function getClientByPhone(phoneNumber) {
  // Reload from disk each time so you can add clients without restarting the server
  const clients = JSON.parse(fs.readFileSync(clientsFilePath, 'utf8'));

  // Normalize: strip spaces, dashes, parentheses
  const normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');

  return clients[normalized] || null;
}

module.exports = { getClientByPhone };
