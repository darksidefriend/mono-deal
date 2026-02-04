const Lobby = require('../models/Lobby');

class LobbyManager {
  constructor() {
    this.lobbies = new Map();
  }

  createLobby(id, name, creatorId, maxPlayers = 5) {
    const lobby = new Lobby(id, name, creatorId, maxPlayers);
    this.lobbies.set(id, lobby);
    return lobby;
  }

  getLobby(id) {
    return this.lobbies.get(id);
  }

  removeLobby(id) {
    this.lobbies.delete(id);
  }

  getPublicLobbies() {
    return Array.from(this.lobbies.values())
      .filter(lobby => !lobby.gameStarted)
      .map(lobby => lobby.toJSON());
  }

  getOnlinePlayers() {
    const players = [];
    this.lobbies.forEach(lobby => {
      lobby.players.forEach(player => {
        players.push({
          id: player.id,
          name: player.name
        });
      });
    });
    return players;
  }
}

module.exports = LobbyManager;