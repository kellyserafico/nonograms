import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Board from "../components/Board";
import { getRoom, getPlayerName, getIsHost, setIsHost, clearRoom } from "../roomStore";

const fmtTime = (s) =>
	s == null ? "DNF" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ─── Leaderboard overlay ────────────────────────────────────────────────────
function LeaderboardOverlay({ roundLeaderboard, overallLeaderboard, round, totalRounds, isLastRound, isHost, onNext }) {
	return (
		<div className="fixed inset-0 flex items-center justify-center z-50"
			style={{ background: "rgba(200,160,180,0.3)", backdropFilter: "blur(6px)" }}>
			<div className="rounded-3xl p-8 w-96 shadow-xl flex flex-col gap-4"
				style={{ background: "#fff0f6", border: "2px solid #f7c5dc" }}>
				<h2 className="text-2xl font-extrabold text-center" style={{ color: "#c084a0" }}>
					🏆 Round {round} Results
				</h2>

				<div>
					<h3 className="text-sm font-bold mb-2" style={{ color: "#b07090" }}>This Round</h3>
					<ul className="space-y-1">
						{roundLeaderboard.map((entry, i) => (
							<li key={i} className="flex justify-between items-center px-3 py-1 rounded-full"
								style={{ background: i === 0 ? "#fde8f0" : "rgba(255,255,255,0.6)" }}>
								<span className="font-semibold" style={{ color: "#9b5b7a" }}>
									{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`} {entry.name}
									{entry.dnf && <span className="text-xs ml-1" style={{ color: "#c4a8bc" }}>(DNF)</span>}
								</span>
								<span className="text-sm font-mono" style={{ color: "#c084a0" }}>
									{fmtTime(entry.time)}
								</span>
							</li>
						))}
					</ul>
				</div>

				{totalRounds > 1 && (
					<div>
						<h3 className="text-sm font-bold mb-2" style={{ color: "#b07090" }}>Overall Standings</h3>
						<ul className="space-y-1">
							{overallLeaderboard.map((entry, i) => (
								<li key={i} className="flex justify-between items-center px-3 py-1 rounded-full"
									style={{ background: i === 0 ? "#e8fdf0" : "rgba(255,255,255,0.6)" }}>
									<span className="font-semibold" style={{ color: "#3a6a5b" }}>
										#{entry.rank} {entry.name}
									</span>
									<span className="text-xs" style={{ color: "#6aac8b" }}>
										{entry.points} pts
									</span>
								</li>
							))}
						</ul>
						<p className="text-xs mt-1 text-center" style={{ color: "#c4a8bc" }}>
							lower points = better rank
						</p>
					</div>
				)}

				{isHost && (
					<button onClick={onNext}
						className="mt-2 font-bold rounded-full py-2 px-8 shadow-sm transition-transform hover:scale-105"
						style={{ background: isLastRound ? "#f7c5dc" : "#c5dff7", color: isLastRound ? "#9b5b7a" : "#3a6a9b" }}>
						{isLastRound ? "🎉 End Game" : `▶ Start Round ${round + 1}`}
					</button>
				)}
				{!isHost && (
					<p className="text-center text-sm animate-pulse" style={{ color: "#c4a8bc" }}>
						Waiting for host to continue…
					</p>
				)}
			</div>
		</div>
	);
}

// ─── Game Over screen ────────────────────────────────────────────────────────
function GameOverScreen({ leaderboard, onLeave }) {
	return (
		<div className="flex flex-col items-center min-h-screen px-6 py-12"
			style={{ background: "linear-gradient(135deg, #fde8f0 0%, #e8f0fd 50%, #e8fdf0 100%)" }}>
			<div className="text-6xl mb-3">🎉</div>
			<h1 className="text-4xl font-extrabold mb-1" style={{ color: "#c084a0" }}>Game Over!</h1>
			<p className="text-sm mb-8" style={{ color: "#c4a8bc" }}>Final Standings</p>

			<div className="rounded-2xl p-6 w-80 shadow-md" style={{ background: "rgba(255,255,255,0.65)" }}>
				<ul className="space-y-2">
					{leaderboard.map((entry, i) => (
						<li key={i} className="flex justify-between items-center px-4 py-2 rounded-full"
							style={{ background: i === 0 ? "#fde8f0" : "rgba(255,255,255,0.5)" }}>
							<span className="font-bold" style={{ color: "#9b5b7a" }}>
								{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`} {entry.name}
							</span>
							<span className="text-xs" style={{ color: "#c4a8bc" }}>{entry.points} pts</span>
						</li>
					))}
				</ul>
			</div>

			<button onClick={onLeave}
				className="mt-8 font-bold rounded-full px-8 py-2 shadow-sm transition-transform hover:scale-105"
				style={{ background: "#f7c5dc", color: "#9b5b7a" }}>
				Back to Menu
			</button>
		</div>
	);
}

// ─── Main component ──────────────────────────────────────────────────────────
function MultiplayerLobby() {
	const { roomCode } = useParams();
	const navigate = useNavigate();
	const roomRef = useRef(null);
	const playersMapRef = useRef({});
	const boardSizeRef = useRef(10);

	const [isHost, setIsHostState] = useState(getIsHost());
	const [players, setPlayers] = useState([]);
	const [copied, setCopied] = useState(false);

	// Game state
	const [phase, setPhase] = useState("waiting"); // waiting | playing | roundOver | gameOver
	const [settings, setSettings] = useState({ boardVisibility: true, rounds: 1, boardSize: 10 });
	const [currentRound, setCurrentRound] = useState(1);
	const [iFinished, setIFinished] = useState(false);       // current player finished this round
	const [finishedNames, setFinishedNames] = useState([]);   // names who finished this round
	const [roundData, setRoundData] = useState(null);         // leaderboard data for overlay
	const [finalLeaderboard, setFinalLeaderboard] = useState([]);

	const myName = getPlayerName();

	// Game board state
	const [puzzle, setPuzzle] = useState(null);
	// {playerName: [[color, ...]]} — live cell colors for each opponent
	const [opponentColors, setOpponentColors] = useState({});

	// Sort so current player is always first
	const sortedPlayers = [
		...players.filter((n) => n === myName),
		...players.filter((n) => n !== myName),
	];

	const handleWin = useCallback((time) => {
		const room = roomRef.current;
		if (!room) return;
		setIFinished(true);
		room.send("player_finished", { time });
	}, []);

	const handleCellUpdate = useCallback((i, j, color) => {
		roomRef.current?.send("cell_update", { row: i, col: j, color });
	}, []);

	const initOpponentColors = (playerList, excludeName, boardSize = 10) => {
		const blank = Array.from({ length: boardSize }, () => Array(boardSize).fill("white"));
		const init = {};
		playerList.filter((n) => n !== excludeName).forEach((n) => {
			init[n] = blank.map((row) => [...row]);
		});
		return init;
	};

	useEffect(() => {
		const room = getRoom();
		if (!room) { navigate("/multiplayer"); return; }
		roomRef.current = room;

		// Player list via schema state changes
		room.state.players.onAdd((_player, sessionId) => {
			playersMapRef.current[sessionId] = _player.name;
			setPlayers(Object.values(playersMapRef.current));
		});
		room.state.players.onRemove((_player, sessionId) => {
			delete playersMapRef.current[sessionId];
			setPlayers(Object.values(playersMapRef.current));
		});

		// Host role
		room.onMessage("role", ({ isHost: h }) => {
			setIsHost(h);
			setIsHostState(h);
		});

		// Game started
		room.onMessage("game_started", ({ settings: s, round, puzzle: p }) => {
			setSettings(s);
			boardSizeRef.current = s.boardSize;
			setCurrentRound(round);
			setIFinished(false);
			setFinishedNames([]);
			setPuzzle(p);
			setOpponentColors(initOpponentColors(Object.values(playersMapRef.current), myName, s.boardSize));
			setPhase("playing");
		});

		// Someone finished
		room.onMessage("player_finished", ({ name }) => {
			setFinishedNames((prev) => [...prev, name]);
		});

		// Round over
		room.onMessage("round_over", (data) => {
			setRoundData(data);
			setPhase("roundOver");
		});

		// Opponent cell update
		room.onMessage("player_cell_update", ({ playerName, row, col, color }) => {
			setOpponentColors((prev) => {
				const current = prev[playerName];
				if (!current) return prev;
				const next = current.map((r, ri) =>
					r.map((c, ci) => (ri === row && ci === col ? color : c))
				);
				return { ...prev, [playerName]: next };
			});
		});

		// Next round started
		room.onMessage("round_started", ({ round, puzzle: p }) => {
			setCurrentRound(round);
			setIFinished(false);
			setFinishedNames([]);
			setRoundData(null);
			setPuzzle(p);
			setOpponentColors(initOpponentColors(Object.values(playersMapRef.current), myName, boardSizeRef.current));
			setPhase("playing");
		});

		// Game over
		room.onMessage("game_over", ({ leaderboard }) => {
			setFinalLeaderboard(leaderboard);
			setPhase("gameOver");
		});
	}, []);

	const startGame = () => roomRef.current?.send("start_game");
	const nextRound = () => roomRef.current?.send("next_round");

	const leaveRoom = () => {
		roomRef.current?.leave();
		clearRoom();
		navigate("/multiplayer");
	};

	const copyCode = () => {
		navigator.clipboard.writeText(roomCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	// ── Game Over ────────────────────────────────────────────────────────────
	if (phase === "gameOver") {
		return <GameOverScreen leaderboard={finalLeaderboard} onLeave={leaveRoom} />;
	}

	// ── Shared board visibility logic ────────────────────────────────────────
	const isOpponentBlurred = (name) => {
		if (name === myName) return false;
		if (!settings.boardVisibility && !iFinished) return true;
		return false;
	};

	return (
		<div className="flex flex-col items-center min-h-screen px-6 py-8"
			style={{ background: "linear-gradient(135deg, #fde8f0 0%, #e8f0fd 50%, #e8fdf0 100%)" }}>

			{phase === "roundOver" && roundData && (
				<LeaderboardOverlay
					{...roundData}
					isHost={isHost}
					onNext={nextRound}
				/>
			)}

			{/* Header */}
			<div className="mb-1 text-4xl">🌸</div>
			<h1 className="text-4xl font-extrabold mb-1" style={{ color: "#c084a0" }}>
				{phase === "waiting" ? "Room Lobby" : `Round ${currentRound} / ${settings.rounds}`}
			</h1>

			{/* Room code */}
			<button onClick={copyCode}
				className="mb-4 rounded-full px-5 py-1 text-sm font-semibold shadow-sm transition-transform hover:scale-105"
				style={{ background: "#f7c5dc", color: "#9b5b7a" }}>
				{copied ? "✓ Copied!" : `Room: ${roomCode}`}
			</button>

			{/* ── WAITING PHASE ────────────────────────────────────────────── */}
			{phase === "waiting" && (
				<>
					<div className="rounded-2xl p-5 shadow-md mb-6 w-72 text-center"
						style={{ background: "rgba(255,255,255,0.6)" }}>
						<h2 className="text-lg font-bold mb-3" style={{ color: "#c084a0" }}>
							Players {players.length > 0 && `(${players.length})`}
						</h2>
						{players.length === 0 ? (
							<p className="text-sm animate-pulse" style={{ color: "#c4a8bc" }}>
								Waiting for players to join…
							</p>
						) : (
							<ul className="space-y-2">
								{sortedPlayers.map((name, i) => (
									<li key={i} className="flex items-center justify-center gap-2 font-semibold"
										style={{ color: "#9b5b7a" }}>
										<span className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-white"
											style={{ background: "#e8a0c0" }}>
											{i + 1}
										</span>
										{name}
										{name === myName && <span className="text-xs" style={{ color: "#c4a8bc" }}>(you)</span>}
										{i === 0 && players.length > 1 && name !== myName && (
											<span className="text-xs" style={{ color: "#c4a8bc" }}>👑 host</span>
										)}
									</li>
								))}
							</ul>
						)}
						{players.length > 0 && (
							<p className="text-xs mt-3" style={{ color: "#c4a8bc" }}>
								Share the room code so friends can join!
							</p>
						)}
					</div>

					{isHost && players.length >= 1 && (
						<button onClick={startGame}
							className="font-bold rounded-full px-10 py-3 mb-4 shadow-md transition-transform hover:scale-105 text-lg"
							style={{ background: "#c5dff7", color: "#3a6a9b" }}>
							▶ Start Game
						</button>
					)}
					{!isHost && (
						<p className="text-sm mb-4 animate-pulse" style={{ color: "#c4a8bc" }}>
							Waiting for the host to start…
						</p>
					)}
				</>
			)}

			{/* ── PLAYING PHASE ────────────────────────────────────────────── */}
			{(phase === "playing" || phase === "roundOver") && (
				<>
					{/* Finished ticker */}
					{finishedNames.length > 0 && (
						<div className="flex gap-2 flex-wrap justify-center mb-4">
							{finishedNames.map((name, i) => (
								<span key={i} className="text-xs font-semibold rounded-full px-3 py-1"
									style={{ background: "#e8fdf0", color: "#3a9b6a" }}>
									✓ {name}
								</span>
							))}
						</div>
					)}

					<div className="flex justify-center gap-10 flex-wrap mb-8">
						{sortedPlayers.map((name) => {
							const isMe = name === myName;
							return (
								<div key={`${currentRound}-${name}`} className="text-center">
									<h2 className="text-lg font-bold mb-2" style={{ color: "#c084a0" }}>
										{name}
										{isMe && <span className="text-xs ml-1" style={{ color: "#c4a8bc" }}>(you)</span>}
										{finishedNames.includes(name) && (
											<span className="text-xs ml-1" style={{ color: "#3a9b6a" }}>✓</span>
										)}
									</h2>
									<Board
										key={`${currentRound}-${name}-board`}
										size={settings.boardSize}
										initialSolution={puzzle}
										onWin={isMe ? handleWin : undefined}
										onCellUpdate={isMe ? handleCellUpdate : undefined}
										externalCellColors={isMe ? null : opponentColors[name]}
										readOnly={!isMe}
										blurred={isOpponentBlurred(name)}
									/>
								</div>
							);
						})}
					</div>
				</>
			)}

			{/* Leave button */}
			<button onClick={leaveRoom}
				className="text-sm font-semibold rounded-full px-6 py-2 shadow-sm transition-transform hover:scale-105"
				style={{ background: "#e8d5f0", color: "#8b5b9b" }}>
				Leave Room
			</button>
		</div>
	);
}

export default MultiplayerLobby;
