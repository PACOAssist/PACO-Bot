const axios = require('axios');

const TRELLO_BASE = 'https://api.trello.com/1';

function auth() {
  return {
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
  };
}

/**
 * Returns all open lists and their cards for the given board.
 * Cards include name, description (truncated), due date, and labels.
 */
async function getBoardSummary(boardId) {
  const res = await axios.get(`${TRELLO_BASE}/boards/${boardId}/lists`, {
    params: {
      ...auth(),
      cards: 'open',
      card_fields: 'name,desc,due,dueComplete,labels,url',
      filter: 'open',
    },
  });

  return res.data.map((list) => ({
    list: list.name,
    cards: list.cards.map((card) => ({
      name: card.name,
      description: card.desc ? card.desc.substring(0, 300) : null,
      due: card.due ? new Date(card.due).toLocaleDateString('en-GB') : null,
      dueComplete: card.dueComplete,
      labels: card.labels.map((l) => l.name).filter(Boolean),
      url: card.url,
    })),
  }));
}

/**
 * Returns the last 10 significant actions on the board
 * (card creation, moves, updates, and comments).
 */
async function getRecentActivity(boardId) {
  const res = await axios.get(`${TRELLO_BASE}/boards/${boardId}/actions`, {
    params: {
      ...auth(),
      filter: 'createCard,updateCard,commentCard,moveCardToBoard',
      limit: 10,
    },
  });

  return res.data.map((action) => {
    const base = {
      type: action.type,
      date: new Date(action.date).toLocaleString('en-GB'),
      by: action.memberCreator?.fullName || 'Unknown',
    };

    if (action.type === 'commentCard') {
      return { ...base, card: action.data.card?.name, comment: action.data.text?.substring(0, 200) };
    }
    if (action.type === 'updateCard') {
      return { ...base, card: action.data.card?.name, changes: action.data.old };
    }
    if (action.type === 'createCard') {
      return { ...base, card: action.data.card?.name, list: action.data.list?.name };
    }
    return { ...base, data: action.data };
  });
}

module.exports = { getBoardSummary, getRecentActivity };
