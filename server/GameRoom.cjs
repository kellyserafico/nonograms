const colyseus = require("colyseus");
const { GameState, Player } = require("./GameState.cjs");

class GameRoom extends colyseus.Room {
	onCreate() {
		this.setState(new GameState());
		console.log("✅ Game room created!");
	}

	onJoin(client, options) {
		console.log(`🔄 Player attempting to join: ${client.sessionId}, Name: ${options.name}`);

		// ✅ Block duplicate session joins
		if (this.state.players[client.sessionId]) {
			console.warn(`⚠️ Player ${client.sessionId} is already in the room. Ignoring duplicate join.`);
			return;
		}

		// ✅ Ensure player has a valid name
		const playerName = options?.name?.trim() || `Player ${Object.keys(this.state.players).length + 1}`;
		this.state.players[client.sessionId] = new Player(playerName);
		console.log(`✅ Player joined: ${client.sessionId} as ${playerName}`);

		// ✅ Log players to debug unexpected joins
		console.log("🛠️ Full player state:", JSON.stringify(this.state.players, null, 2));

		// ✅ Broadcast updated player list
		this.broadcast(
			"update_players",
			Object.values(this.state.players).map((p) => p.name)
		);
	}

	onLeave(client) {
		if (this.state.players[client.sessionId]) {
			console.log(`🚪 Player left: ${client.sessionId}`);
			delete this.state.players[client.sessionId];

			// 🔍 Log the updated player state after someone leaves
			console.log("🛠️ Updated player state:", JSON.stringify(this.state.players, null, 2));

			// ✅ Send updated list with only real players
			this.broadcast(
				"update_players",
				Object.values(this.state.players).map((p) => p.name)
			);
		}
	}
}

module.exports = { GameRoom };
