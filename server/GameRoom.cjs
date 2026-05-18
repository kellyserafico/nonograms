const colyseus = require("colyseus");
const { GameState, Player } = require("./GameState.cjs");

class GameRoom extends colyseus.Room {
	onCreate(options) {
		this.setState(new GameState());

		this.settings = {
			maxPlayers: Math.min(Math.max(options.maxPlayers || 4, 1), 10),
			boardVisibility: options.boardVisibility !== false,
			rounds: Math.min(Math.max(options.rounds || 1, 1), 10),
			boardSize: Math.min(Math.max(options.boardSize || 10, 5), 20),
		};
		this.maxClients = this.settings.maxPlayers;

		this.hostId = null;
		this.currentRound = 0;
		this.finishedPlayers = []; // per-round finishes
		this.cumulativeScores = {}; // sessionId -> total rank points (lower = better)

		this.onMessage("start_game", (client) => {
			if (client.sessionId !== this.hostId) return;
			this.currentRound = 1;
			this.finishedPlayers = [];
			const puzzle = this.generatePuzzle(this.settings.boardSize);
			this.broadcast("game_started", {
				settings: this.settings,
				round: this.currentRound,
				puzzle,
			});
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

			const totalPlayers = Object.keys(this.state.players).length;
			if (this.finishedPlayers.length >= totalPlayers) {
				this.endRound();
			}
		});

		this.onMessage("next_round", (client) => {
			if (client.sessionId !== this.hostId) return;
			if (this.currentRound >= this.settings.rounds) {
				this.broadcast("game_over", { leaderboard: this.buildLeaderboard() });
			} else {
				this.currentRound++;
				this.finishedPlayers = [];
				const puzzle = this.generatePuzzle(this.settings.boardSize);
				this.broadcast("round_started", { round: this.currentRound, puzzle });
			}
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

		this.cumulativeScores[client.sessionId] = 0;

		this.broadcastPlayerList();
		client.send("role", { isHost: client.sessionId === this.hostId });
	}

	onLeave(client) {
		if (!this.state.players[client.sessionId]) return;

		delete this.state.players[client.sessionId];
		delete this.cumulativeScores[client.sessionId];

		if (client.sessionId === this.hostId) {
			const remaining = Object.keys(this.state.players);
			if (remaining.length > 0) {
				this.hostId = remaining[0];
				const newHost = this.clients.find((c) => c.sessionId === this.hostId);
				newHost?.send("role", { isHost: true });
			}
		}

		this.broadcastPlayerList();

		// End round early if all remaining players have finished
		if (
			this.currentRound > 0 &&
			Object.keys(this.state.players).length > 0 &&
			this.finishedPlayers.length >= Object.keys(this.state.players).length
		) {
			this.endRound();
		}
	}

	endRound() {
		// Accumulate rank points (1st = 1pt, 2nd = 2pt, lower is better)
		this.finishedPlayers.forEach((p, i) => {
			if (this.cumulativeScores[p.sessionId] !== undefined) {
				this.cumulativeScores[p.sessionId] += i + 1;
			}
		});

		this.broadcast("round_over", {
			roundLeaderboard: this.buildRoundLeaderboard(),
			overallLeaderboard: this.buildOverallLeaderboard(),
			round: this.currentRound,
			totalRounds: this.settings.rounds,
			isLastRound: this.currentRound >= this.settings.rounds,
		});
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

	buildOverallLeaderboard() {
		return Object.entries(this.cumulativeScores)
			.map(([sessionId, points]) => ({
				name: this.state.players[sessionId]?.name || "?",
				points,
			}))
			.sort((a, b) => a.points - b.points)
			.map((entry, i) => ({ ...entry, rank: i + 1 }));
	}

	buildLeaderboard() {
		return this.buildOverallLeaderboard();
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
