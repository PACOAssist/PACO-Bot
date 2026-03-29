require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getBoardSummary, getRecentActivity } = require('./trello');
const { getClientSummary } = require('./clockify');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---------------------------------------------------------------------------
// Tool / Function declarations (Gemini function calling format)
// ---------------------------------------------------------------------------
const tools = [
  {
    functionDeclarations: [
      {
        name: 'get_trello_board',
        description:
          "Fetch the current state of the client's Trello board — all lists and their open cards, including names, descriptions, due dates, and labels. Call this whenever the client asks about tasks, project status, progress, or what is pending.",
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
      {
        name: 'get_trello_activity',
        description:
          "Fetch the most recent 10 actions on the client's Trello board (card moves, new cards, comments). Call this when the client asks what has recently changed or what has been done lately.",
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
      {
        name: 'get_clockify_hours',
        description:
          "Fetch the time-tracking summary for the client from Clockify for the current month, broken down by project. Call this when the client asks about hours logged, time spent, or billing.",
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// System instruction
// ---------------------------------------------------------------------------
function getSystemInstruction(client) {
  return `You are a helpful project assistant for PACO Services. You are chatting with ${client.name} via WhatsApp.

Your role is to help this client with:
- Project status, tasks, and progress (via their Trello board)
- Hours logged and time tracking this month (via Clockify)
- General project updates

Guidelines:
- Be friendly, professional, and concise — this is WhatsApp, so keep messages short and readable on mobile.
- Use plain text formatting. You may use line breaks and dashes for lists, but avoid markdown (no **, ##, etc.).
- Always fetch fresh data from Trello or Clockify when answering project-related questions — do not guess.
- If asked about billing amounts, contracts, new work requests, or anything outside your scope, politely direct them to contact PACO Services directly.
- Keep responses under 1500 characters when possible.
- Today's date is ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
}

// ---------------------------------------------------------------------------
// Convert stored history (role: user/assistant) → Gemini format (role: user/model)
// ---------------------------------------------------------------------------
function toGeminiHistory(history) {
  // Exclude the last message (current user turn) — we send that separately
  return history.slice(0, -1).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
}

// ---------------------------------------------------------------------------
// Execute a function call requested by Gemini
// ---------------------------------------------------------------------------
async function executeTool(name, client) {
  if (name === 'get_trello_board') {
    const data = await getBoardSummary(client.trelloBoardId);
    return JSON.stringify(data, null, 2);
  }

  if (name === 'get_trello_activity') {
    const data = await getRecentActivity(client.trelloBoardId);
    return JSON.stringify(data, null, 2);
  }

  if (name === 'get_clockify_hours') {
    const data = await getClientSummary(
      process.env.CLOCKIFY_WORKSPACE_ID,
      client.clockifyClientId
    );
    return JSON.stringify(data, null, 2);
  }

  return 'Unknown tool.';
}

// ---------------------------------------------------------------------------
// Main entry point — called from index.js for every incoming message
// ---------------------------------------------------------------------------
async function processMessage(client, history) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: getSystemInstruction(client),
    tools,
  });

  // Build Gemini chat with prior conversation history
  const chat = model.startChat({
    history: toGeminiHistory(history),
  });

  // The current user message is the last item in history
  const currentMessage = history[history.length - 1].content;

  // Agentic loop — keep going until Gemini stops calling functions
  let result = await chat.sendMessage(currentMessage);

  while (true) {
    const response = result.response;
    const candidate = response.candidates?.[0];

    if (!candidate) {
      throw new Error('Gemini returned no candidates');
    }

    // Check if Gemini wants to call a function
    const functionCallPart = candidate.content.parts.find((p) => p.functionCall);

    if (!functionCallPart) {
      // No more function calls — extract and return the text response
      const text = response.text();
      if (!text) {
        return "I wasn't able to get an answer right now. Please contact PACO Services directly.";
      }
      return text;
    }

    // Execute the requested function
    const { name } = functionCallPart.functionCall;
    console.log(`[Gemini] Calling tool: ${name}`);

    let toolOutput;
    try {
      toolOutput = await executeTool(name, client);
    } catch (err) {
      toolOutput = `Error fetching data: ${err.message}`;
      console.error(`[Tool Error] ${name}:`, err.message);
    }

    // Send the function result back to Gemini
    result = await chat.sendMessage([
      {
        functionResponse: {
          name,
          response: { output: toolOutput },
        },
      },
    ]);
  }
}

module.exports = { processMessage };
