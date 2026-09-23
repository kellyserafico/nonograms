const colyseus = require("colyseus");
const { GameState, Player } = require("./GameState.cjs");

class GameRoom extends colyseus.Room {
	onCreate(options) {
		this.setState(new GameState());

		this.settings = {
			maxPlayers: Math.min(Math.max(options.maxPlayers || 4, 1), 10),
			boardVisibility: options.boardVisibility === true,
			boardSize: Math.min(Math.max(options.boardSize || 10, 5), 20),
			firstTo: 1, // round wins needed to win the match
		};
		this.maxClients = this.settings.maxPlayers;

		this.hostId = null;
		this.currentRound = 0;
		this.finishedPlayers = []; // per-round finishes
		this.roundWins = {};       // sessionId -> number of round wins
		this.roundEnded = false;   // guard against double endRound()
		this.lobbySettings = { boardVisibility: false, firstTo: 1, boardSize: 10 };

		this.onMessage("start_game", (client, msg) => {
			if (client.sessionId !== this.hostId) return;
			if (msg?.boardVisibility !== undefined) this.settings.boardVisibility = !!msg.boardVisibility;
			if (msg?.firstTo !== undefined) this.settings.firstTo = Math.min(Math.max(parseInt(msg.firstTo) || 1, 1), 10);
			if (msg?.boardSize !== undefined) this.settings.boardSize = Math.min(Math.max(parseInt(msg.boardSize) || 10, 5), 20);
			this.currentRound = 1;
			this.finishedPlayers = [];
			this.roundEnded = false;
			Object.keys(this.roundWins).forEach((id) => { this.roundWins[id] = 0; });
			const puzzle = this.generatePuzzle(this.settings.boardSize);
			this.broadcast("game_started", {
				settings: this.settings,
				round: this.currentRound,
				puzzle,
			});
		});

		this.onMessage("lobby_settings_update", (client, msg) => {
			if (client.sessionId !== this.hostId) return;
			if (msg?.boardVisibility !== undefined) this.lobbySettings.boardVisibility = !!msg.boardVisibility;
			if (msg?.firstTo !== undefined) this.lobbySettings.firstTo = msg.firstTo;
			if (msg?.boardSize !== undefined) this.lobbySettings.boardSize = msg.boardSize;
			this.broadcast("lobby_settings", this.lobbySettings, { except: client });
		});

		this.onMessage("cell_update", (client, { row, col, color }) => {
			const player = this.state.players[client.sessionId];
			if (!player) return;
			this.broadcast("player_cell_update", { playerName: player.name, row, col, color }, { except: client });
		});

		this.onMessage("player_finished", (client, { time }) => {
			if (this.finishedPlayers.find((p) => p.sessionId === client.sessionId)) return;
			const player = this.state.players[client.sessionId];
			if (!player) return;

			const entry = { sessionId: client.sessionId, name: player.name, time };
			this.finishedPlayers.push(entry);

			this.broadcast("player_finished", {
				name: player.name,
				rank: this.finishedPlayers.length,
				time,
			});

			const totalPlayers = Object.keys(this.roundWins).length;
			const allDone = this.finishedPlayers.length >= totalPlayers;
			const lastOneStanding = totalPlayers > 1 && this.finishedPlayers.length >= totalPlayers - 1;
			if (allDone || lastOneStanding) {
				this.endRound();
			}
		});

		this.onMessage("next_round", (client) => {
			if (client.sessionId !== this.hostId) return;
			this.currentRound++;
			this.finishedPlayers = [];
			this.roundEnded = false;
			const puzzle = this.generatePuzzle(this.settings.boardSize);
			this.broadcast("round_started", { round: this.currentRound, puzzle });
		});
	}

	onJoin(client, options) {
		if (this.state.players[client.sessionId]) return;

		const playerName =
			options?.name?.trim() || `Player ${Object.keys(this.state.players).length + 1}`;
		this.state.players[client.sessionId] = new Player(playerName);

		if (!this.hostId) {
			this.hostId = client.sessionId;
		}

		this.roundWins[client.sessionId] = 0;

		this.broadcastPlayerList();
		client.send("role", { isHost: client.sessionId === this.hostId });
		client.send("lobby_settings", this.lobbySettings);
	}

	onLeave(client) {
		if (!this.state.players[client.sessionId]) return;

		delete this.state.players[client.sessionId];
		delete this.roundWins[client.sessionId];

		if (client.sessionId === this.hostId) {
			const remaining = Object.keys(this.state.players);
			if (remaining.length > 0) {
				this.hostId = remaining[0];
				const newHost = this.clients.find((c) => c.sessionId === this.hostId);
				newHost?.send("role", { isHost: true });
			}
		}

		this.broadcastPlayerList();

		const remaining = Object.keys(this.roundWins).length;
		if (this.currentRound > 0 && remaining > 0 && this.finishedPlayers.length >= remaining) {
			this.endRound();
		}
	}

	endRound() {
		if (this.roundEnded) return;
		this.roundEnded = true;

		// Award a win to the round winner (first to finish)
		const roundWinner = this.finishedPlayers[0];
		if (roundWinner && this.roundWins[roundWinner.sessionId] !== undefined) {
			this.roundWins[roundWinner.sessionId]++;
		}

		const roundLeaderboard = this.buildRoundLeaderboard();
		const wins = this.buildWinsLeaderboard();

		// Check if someone has reached firstTo wins
		const matchWinner = wins.find((e) => e.wins >= this.settings.firstTo);
		if (matchWinner) {
			this.broadcast("game_over", { leaderboard: wins });
		} else {
			this.broadcast("round_over", {
				roundLeaderboard,
				winsLeaderboard: wins,
				round: this.currentRound,
				firstTo: this.settings.firstTo,
			});
		}
	}

	buildRoundLeaderboard() {
		const finished = this.finishedPlayers.map((p, i) => ({
			rank: i + 1,
			name: p.name,
			time: p.time,
			dnf: false,
		}));

		const finishedIds = new Set(this.finishedPlayers.map((p) => p.sessionId));
		const dnf = Object.entries(this.state.players)
			.filter(([id]) => !finishedIds.has(id))
			.map(([, player], i) => ({
				rank: finished.length + 1 + i,
				name: player.name,
				time: null,
				dnf: true,
			}));

		return [...finished, ...dnf];
	}

	buildWinsLeaderboard() {
		return Object.entries(this.roundWins)
			.map(([sessionId, wins]) => ({
				name: this.state.players[sessionId]?.name || "?",
				wins,
			}))
			.sort((a, b) => b.wins - a.wins)
			.map((entry, i) => ({ ...entry, rank: i + 1 }));
	}

	generatePuzzle(size) {
		return Array.from({ length: size }, () =>
			Array.from({ length: size }, () => Math.random() < 0.5)
		);
	}

	broadcastPlayerList() {
		this.broadcast(
			"update_players",
			Object.values(this.state.players).map((p) => p.name)
		);
	}
}

module.exports = { GameRoom };
