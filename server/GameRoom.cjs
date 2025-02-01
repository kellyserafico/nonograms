const colyseus = require("colyseus");
const { Room } = colyseus;

class GameRoom extends Room {
	maxClients = 2;

	onCreate() {
		this.setState({
			players: {},
			gameStarted: false,
		});
	}

	onJoin(client) {
		this.state.players[client.sessionId] = { board: [] };

		if (Object.keys(this.state.players).length === 2) {
			this.state.gameStarted = true;
			this.broadcast("start_game");
		}
	}

	onMessage(client, message) {
		if (message.type === "update_board") {
			this.state.players[client.sessionId].board = message.board;
			this.broadcast("update_board", this.state.players);
		}
	}

	onLeave(client) {
		delete this.state.players[client.sessionId];
		this.state.gameStarted = false;
	}
}

module.exports = { GameRoom };
