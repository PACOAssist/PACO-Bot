/**
 * In-memory conversation history store.
 *
 * Each phone number gets its own rolling window of messages so Gemini
 * has context across multiple WhatsApp messages in the same conversation.
 *
 * Note: History resets if the server restarts. For persistence across
 * restarts, replace the Map with a database (e.g. Redis or Supabase).
 */

const MAX_MESSAGES = 20; // Keep the last 20 messages per phone number

const store = new Map();

/**
 * Append a message to the conversation history for a phone number.
 * @param {string} phoneNumber
 * @param {'user'|'assistant'} role
 * @param {string} content
 */
function addMessage(phoneNumber, role, content) {
  if (!store.has(phoneNumber)) {
    store.set(phoneNumber, []);
  }

  const history = store.get(phoneNumber);
  history.push({ role, content });

  // Trim to the rolling window
  if (history.length > MAX_MESSAGES) {
    history.splice(0, history.length - MAX_MESSAGES);
  }
}

/**
 * Retrieve the conversation history for a phone number.
 * @param {string} phoneNumber
 * @returns {Array<{ role: string, content: string }>}
 */
function getHistory(phoneNumber) {
  return store.get(phoneNumber) || [];
}

/**
 * Clear the conversation history for a phone number (e.g. on request).
 * @param {string} phoneNumber
 */
function clearHistory(phoneNumber) {
  store.delete(phoneNumber);
}

module.exports = { addMessage, getHistory, clearHistory };
