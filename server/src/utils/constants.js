module.exports = {
  GAME_CONSTANTS: {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 5,
    INITIAL_CARDS: 5,
    MAX_CARDS_IN_HAND: 7,
    WIN_CONDITION: 3 // 3 полных комплекта собственности
  },
  
  PLAYER_STATUS: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    READY: 'ready',
    NOT_READY: 'not_ready'
  },
  
  GAME_STATUS: {
    WAITING: 'waiting',
    ACTIVE: 'active',
    FINISHED: 'finished'
  },
  
  TURN_PHASES: {
    DRAW: 'draw',
    ACTION: 'action',
    END: 'end'
  }
};