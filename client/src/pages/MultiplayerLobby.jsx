import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Board from "../components/Board";
import { getRoom, getPlayerName, getIsHost, setIsHost, clearRoom } from "../roomStore";
import { DARK, LIGHT } from "../theme";

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

	const [dark, setDark] = useState(true);
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

	const t = dark ? DARK : LIGHT;

	// ── Waiting phase: new dark-themed lobby UI ───────────────────────────────
	if (phase === "waiting") {
		return (
			<div className="min-h-screen flex flex-col relative overflow-hidden"
				style={{ background: t.bg, color: t.text, transition: "background 0.35s, color 0.35s", fontFamily: "Outfit, sans-serif" }}
			>
				{/* Grid bg */}
				<div className="pointer-events-none absolute inset-0" style={{
					backgroundImage: `linear-gradient(${t.gridBg} 1px, transparent 1px), linear-gradient(90deg, ${t.gridBg} 1px, transparent 1px)`,
					backgroundSize: "32px 32px", opacity: dark ? 0.2 : 0.35,
				}} />
				<div className="pointer-events-none absolute" style={{
					width: 500, height: 500, borderRadius: "50%",
					background: `radial-gradient(circle, ${t.glowColor}22 0%, transparent 70%)`,
					top: "30%", left: "50%", transform: "translate(-50%, -50%)",
				}} />

				{/* Header */}
				<header className="relative z-10 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: t.border }}>
					<button
						onClick={leaveRoom}
						style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: t.textDim, letterSpacing: "0.06em", background: "none", border: "none", cursor: "pointer", padding: 0 }}
						onMouseEnter={(e) => (e.currentTarget.style.color = t.accent)}
						onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						leave
					</button>
					<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: t.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
						nonogram / multi
					</span>
					<button
						onClick={() => setDark((d) => !d)}
						style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 2, padding: "5px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: t.textDim, cursor: "pointer", letterSpacing: "0.12em" }}
						onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
						onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textDim; }}
					>
						{dark ? "[ light ]" : "[ dark ]"}
					</button>
				</header>

				{/* Content */}
				<div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
					<div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 400 }}>
						<div>
							<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: t.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
								lobby created
							</span>
							<h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: t.text, margin: "8px 0 4px", letterSpacing: "-0.02em" }}>
								Waiting for players
							</h2>
							<p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: t.textDim }}>
								share the room code with your friends
							</p>
						</div>

						{/* Room code */}
						<div style={{
							border: `1px solid ${t.accent}40`, borderRadius: 2,
							padding: "24px 28px", background: t.card,
							textAlign: "center", position: "relative", overflow: "hidden",
						}}>
							<div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)` }} />
							<p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: t.textDim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
								room code
							</p>
							<button
								onClick={copyCode}
								style={{ fontSize: "2.8rem", fontWeight: 700, letterSpacing: "0.22em", color: t.accent, fontFamily: "DM Mono, monospace", lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: 0 }}
								title="click to copy"
							>
								{copied ? "copied!" : roomCode}
							</button>
						</div>

						{/* Player list */}
						<div style={{ border: `1px solid ${t.border}`, borderRadius: 2, overflow: "hidden" }}>
							<div style={{ padding: "8px 14px", borderBottom: `1px solid ${t.border}`, background: t.card }}>
								<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: t.textDim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
									players — {sortedPlayers.length} / 4
								</span>
							</div>
							{sortedPlayers.map((name, i) => (
								<div key={name} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, background: t.card, borderTop: i > 0 ? `1px solid ${t.border}` : "none" }}>
									<div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent }} />
									<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: t.text }}>{name}</span>
									{name === myName && <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: t.textDim, letterSpacing: "0.06em" }}>(you)</span>}
									{i === 0 && <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: t.accent, marginLeft: "auto", letterSpacing: "0.08em" }}>host</span>}
								</div>
							))}
							{Array.from({ length: Math.max(0, 4 - sortedPlayers.length) }, (_, i) => (
								<div key={`empty-${i}`} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, background: t.card, borderTop: `1px solid ${t.border}` }}>
									<div style={{ width: 6, height: 6, borderRadius: "50%", background: t.border }} />
									<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: t.textDim, fontStyle: "italic" }}>waiting...</span>
								</div>
							))}
						</div>

						{isHost ? (
							<button
								onClick={startGame}
								style={{
									fontFamily: "DM Mono, monospace", fontSize: "0.78rem",
									padding: "10px 28px", borderRadius: 2,
									border: `1px solid ${t.accent}`, background: t.accent, color: t.accentFg,
									cursor: "pointer", letterSpacing: "0.08em", width: "100%",
								}}
							>
								start game →
							</button>
						) : (
							<p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: t.textDim, textAlign: "center" }}>
								waiting for the host to start…
							</p>
						)}

						<button
							onClick={leaveRoom}
							style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: t.textDim, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em", padding: 0, textAlign: "center" }}
							onMouseEnter={(e) => (e.currentTarget.style.color = t.text)}
							onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
						>
							cancel lobby
						</button>
					</div>
				</div>

				<style>{`
					@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
				`}</style>
			</div>
		);
	}

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
				{`Round ${currentRound} / ${settings.rounds}`}
			</h1>

			{/* Room code */}
			<button onClick={copyCode}
				className="mb-4 rounded-full px-5 py-1 text-sm font-semibold shadow-sm transition-transform hover:scale-105"
				style={{ background: "#f7c5dc", color: "#9b5b7a" }}>
				{copied ? "✓ Copied!" : `Room: ${roomCode}`}
			</button>

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
