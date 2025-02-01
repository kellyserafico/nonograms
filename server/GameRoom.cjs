const colyseus = require("colyseus");
const { GameState, Player } = require("./GameState.cjs");

class GameRoom extends colyseus.Room {
	maxClients = 2;

	onCreate() {
		this.setState(new GameState()); // ✅ Use Colyseus Schema
		console.log("✅ Game room created!");
	}

	onJoin(client) {
		const newPlayer = new Player();
		this.state.players[client.sessionId] = newPlayer;
		console.log(`Player joined: ${client.sessionId}`);

		if (Object.keys(this.state.players).length === 2) {
			this.state.gameStarted = true;
			this.broadcast("start_game");
		}
	}

	onMessage(client, message) {
		if (message.type === "update_board") {
			if (!Array.isArray(message.board) || message.board.length !== 100) {
				console.error("❌ Invalid board format:", message.board);
				return;
			}
			this.state.players[client.sessionId].board = new ArraySchema(...message.board);
			this.broadcast("update_board", this.state.players);
		}
	}

	onLeave(client) {
		delete this.state.players[client.sessionId];
		console.log(`Player left: ${client.sessionId}`);
		this.state.gameStarted = false;
	}
}

module.exports = { GameRoom };
