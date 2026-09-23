import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoom, getPlayerName, getIsHost, setIsHost, clearRoom } from "../roomStore";
import { DARK, LIGHT } from "../theme";

// ─── Player colors ────────────────────────────────────────────────────────────
const PLAYER_COLORS = ["#a3ff6e", "#6eb5ff", "#ffb86e", "#d06eff"];
const PLAYER_COLORS_LIGHT = ["#3d8a1e", "#1a5fa8", "#a05c00", "#7b00cc"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeClues(puzzle) {
	const size = puzzle.length;
	const rowClues = puzzle.map((row) => {
		const c = []; let r = 0;
		for (const v of row) { if (v) r++; else if (r) { c.push(r); r = 0; } }
		if (r) c.push(r);
		return c.length ? c : [0];
	});
	const colClues = Array.from({ length: size }, (_, ci) => {
		const c = []; let r = 0;
		for (let ri = 0; ri < size; ri++) {
			if (puzzle[ri][ci]) r++; else if (r) { c.push(r); r = 0; }
		}
		if (r) c.push(r);
		return c.length ? c : [0];
	});
	return { rowClues, colClues };
}

function countFilled(board) {
	return board.flat().filter((c) => c === 1).length;
}

function countCorrect(board, puzzle) {
	if (!board.length || !puzzle) return 0;
	let n = 0;
	for (let ri = 0; ri < board.length; ri++)
		for (let ci = 0; ci < board[ri].length; ci++)
			if (board[ri][ci] === 1 && puzzle[ri][ci]) n++;
	return n;
}

function isRowSat(board, rowClues, ri) {
	const row = board[ri];
	const runs = []; let run = 0;
	for (const c of row) { if (c === 1) run++; else if (run) { runs.push(run); run = 0; } }
	if (run) runs.push(run);
	return JSON.stringify(runs) === JSON.stringify(rowClues[ri].filter((x) => x > 0));
}

function isColSat(board, colClues, ci) {
	const col = board.map((r) => r[ci]);
	const runs = []; let run = 0;
	for (const c of col) { if (c === 1) run++; else if (run) { runs.push(run); run = 0; } }
	if (run) runs.push(run);
	return JSON.stringify(runs) === JSON.stringify(colClues[ci].filter((x) => x > 0));
}

function formatTime(s) {
	return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const fmtTime = (s) =>
	s == null ? "DNF" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max, color, t }) {
	return (
		<div style={{ height: 3, background: t.border, borderRadius: 2, overflow: "hidden", flex: 1 }}>
			<div style={{
				height: "100%",
				width: `${Math.min(max > 0 ? (value / max) * 100 : 0, 100)}%`,
				background: color, borderRadius: 2, transition: "width 0.4s ease",
			}} />
		</div>
	);
}

function MiniBoard({ board, visible, solved, solvedTime, t, playerColor, size }) {
	const MINI = Math.max(7, Math.min(14, Math.floor(140 / size)));
	const hidden = !visible && !solved;
	return (
		<div style={{ position: "relative", borderRadius: 2, overflow: "hidden" }}>
			{/* Board cells — blur applied when hidden so selections are visible but unreadable */}
			<div style={{
				display: "grid",
				gridTemplateColumns: `repeat(${size}, ${MINI}px)`,
				gap: 1,
				filter: hidden ? "blur(6px)" : "none",
				transition: "filter 0.2s ease",
			}}>
				{board.flat().map((cell, i) => (
					<div key={i} style={{
						width: MINI, height: MINI,
						background: cell === 1 ? playerColor : "#1e2436",
						borderRadius: 1,
					}} />
				))}
			</div>

			{/* Solved overlay */}
			{solved && (
				<div style={{ position: "absolute", inset: 0, background: "rgba(9,11,16,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
					<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: playerColor, letterSpacing: "0.1em" }}>✓ done</span>
					{solvedTime != null && (
						<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#565f7a" }}>{formatTime(solvedTime)}</span>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Round over overlay ───────────────────────────────────────────────────────
function RoundOverOverlay({ roundLeaderboard, winsLeaderboard, round, firstTo, isHost, onNext }) {
	const [countdown, setCountdown] = React.useState(5);
	const winner = roundLeaderboard[0];
	const firedRef = React.useRef(false);
	const onNextRef = React.useRef(onNext);
	React.useEffect(() => { onNextRef.current = onNext; });

	React.useEffect(() => {
		if (countdown <= 0) {
			if (isHost && !firedRef.current) { firedRef.current = true; onNextRef.current(); }
			return;
		}
		const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
		return () => clearTimeout(id);
	}, [countdown, isHost]);

	return (
		<div style={{
			position: "fixed", inset: 0, zIndex: 50,
			background: "rgba(9,11,16,0.88)", backdropFilter: "blur(6px)",
			display: "flex", alignItems: "center", justifyContent: "center",
		}}>
			<div style={{
				background: "#0f1320", border: "1px solid #1e2436",
				borderRadius: 12, padding: "32px 36px", width: 320,
				display: "flex", flexDirection: "column", gap: 0,
			}}>
				<div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#565f7a", letterSpacing: "0.15em", marginBottom: 16, textAlign: "center" }}>
					— ROUND {round} —
				</div>

				{winner && (
					<>
						<div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "#e8eaf0", textAlign: "center", marginBottom: 4 }}>
							{winner.name}
						</div>
						<div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#565f7a", textAlign: "center", marginBottom: 24 }}>
							{winner.dnf ? "no one finished" : `finished first · ${fmtTime(winner.time)}`}
						</div>
					</>
				)}

				{/* Round results — finished players only */}
				<div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
					{roundLeaderboard.filter((e) => !e.dnf).map((entry, i) => (
						<div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#565f7a", width: 20, textAlign: "right" }}>{entry.rank}.</span>
							<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: "#c8cad6", flex: 1 }}>{entry.name}</span>
							<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#565f7a" }}>{fmtTime(entry.time)}</span>
						</div>
					))}
				</div>

				{/* Wins scoreboard */}
				{winsLeaderboard && (
					<div style={{ borderTop: "1px solid #1e2436", paddingTop: 14, marginBottom: 20 }}>
						<div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#565f7a", letterSpacing: "0.12em", marginBottom: 10 }}>
							WINS (first to {firstTo})
						</div>
						{winsLeaderboard.map((entry, i) => (
							<div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
								<span style={{ width: 6, height: 6, borderRadius: "50%", background: PLAYER_COLORS[i] || "#565f7a", flexShrink: 0 }} />
								<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "#c8cad6", flex: 1 }}>{entry.name}</span>
								<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: PLAYER_COLORS[i] || "#565f7a", fontWeight: 600 }}>
									{entry.wins}/{firstTo}
								</span>
							</div>
						))}
					</div>
				)}

				<div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#565f7a", textAlign: "center" }}>
					next round in {countdown}s
				</div>
			</div>
		</div>
	);
}

// ─── Game Over screen ────────────────────────────────────────────────────────
function GameOverScreen({ leaderboard, onLeave }) {
	const winner = leaderboard[0];
	return (
		<div style={{
			minHeight: "100vh", background: "#090b10",
			display: "flex", alignItems: "center", justifyContent: "center",
		}}>
			<div style={{
				background: "#0f1320", border: "1px solid #1e2436",
				borderRadius: 12, padding: "36px 40px", width: 320,
				display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
			}}>
				{/* Header */}
				<div style={{
					fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
					color: "#565f7a", letterSpacing: "0.15em", marginBottom: 20,
				}}>— GAME OVER —</div>

				{/* Winner */}
				{winner && (
					<>
						<div style={{
							fontFamily: "Outfit, sans-serif", fontWeight: 700,
							fontSize: "2rem", color: "#e8eaf0", marginBottom: 6,
						}}>{winner.name}</div>
						<div style={{
							fontFamily: "DM Mono, monospace", fontSize: "0.75rem",
							color: "#565f7a", marginBottom: 28,
						}}>wins the match</div>
					</>
				)}

				{/* Leaderboard */}
				<div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
					{leaderboard.map((entry, i) => (
						<div key={i} style={{
							display: "flex", alignItems: "center", gap: 10,
						}}>
							<span style={{
								fontFamily: "DM Mono, monospace", fontSize: "0.7rem",
								color: "#565f7a", width: 20, textAlign: "right",
							}}>{entry.rank}.</span>
							<span style={{
								width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
								background: PLAYER_COLORS[i] || "#565f7a",
							}} />
							<span style={{
								fontFamily: "DM Mono, monospace", fontSize: "0.8rem",
								color: "#c8cad6", flex: 1,
							}}>{entry.name}</span>
							<span style={{
								fontFamily: "DM Mono, monospace", fontSize: "0.75rem",
								color: PLAYER_COLORS[i] || "#565f7a", fontWeight: 600,
							}}>{entry.wins ?? entry.points}</span>
						</div>
					))}
				</div>

				{/* Button */}
				<button onClick={onLeave} style={{
					width: "100%", fontFamily: "DM Mono, monospace", fontSize: "0.75rem",
					color: "#8b8fa8", background: "#1a1e2e", border: "1px solid #1e2436",
					borderRadius: 6, padding: "10px 0", cursor: "pointer",
				}}>back to lobby</button>
			</div>
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
	const puzzleRef = useRef(null);

	const [dark, setDark] = useState(true);
	const [isHost, setIsHostState] = useState(getIsHost());
	const [players, setPlayers] = useState([]);
	const [copied, setCopied] = useState(false);
	const [lobbySettings, setLobbySettings] = useState({ boardVisibility: false, firstTo: 1, boardSize: 10, hints: false });
	const [guestSettings, setGuestSettings] = useState({ boardVisibility: false, firstTo: 1, boardSize: 10, hints: false });
	const guestSettingsRef = useRef({ boardVisibility: false, firstTo: 1, boardSize: 10, hints: false });
	const [localHints, setLocalHints] = useState(false);

	// Game state
	const [phase, setPhase] = useState("waiting");
	const [settings, setSettings] = useState({ boardVisibility: false, rounds: 1, boardSize: 10, firstTo: 1 });
	const [currentRound, setCurrentRound] = useState(1);
	const [iFinished, setIFinished] = useState(false);
	const [finishedNames, setFinishedNames] = useState([]);
	const [roundData, setRoundData] = useState(null);
	const [finalLeaderboard, setFinalLeaderboard] = useState([]);

	// Board state
	const [puzzle, setPuzzle] = useState(null);
	const [localBoard, setLocalBoard] = useState(null);
	const [opponentStates, setOpponentStates] = useState({});
	const [opponentSolvedAt, setOpponentSolvedAt] = useState({});
	const [rowClues, setRowClues] = useState([]);
	const [colClues, setColClues] = useState([]);
	const [totalCells, setTotalCells] = useState(0);
	const [localSolved, setLocalSolved] = useState(false);

	// In-game UI state
	const [seconds, setSeconds] = useState(0);
	const [inGameVisible, setInGameVisible] = useState(lobbySettings.boardVisibility);
	const [localDragFill, setLocalDragFill] = useState(null);
	const rightDragRef = useRef(false);
	const rightDragMode = useRef(0);

	const myName = getPlayerName();

	const sortedPlayers = [
		...players.filter((n) => n === myName),
		...players.filter((n) => n !== myName),
	];

	const playerColor = (idx) => dark ? PLAYER_COLORS[idx % PLAYER_COLORS.length] : PLAYER_COLORS_LIGHT[idx % PLAYER_COLORS_LIGHT.length];

	// ── Init from server ────────────────────────────────────────────────────
	const initGame = useCallback((s, p, round) => {
		const size = s.boardSize;
		boardSizeRef.current = size;
		setSettings(s);
		setInGameVisible(s.boardVisibility);
		setCurrentRound(round);
		setIFinished(false);
		setFinishedNames([]);
		setLocalSolved(false);
		setSeconds(0);
		puzzleRef.current = p;
		setPuzzle(p);
		setLocalBoard(Array.from({ length: size }, () => Array(size).fill(0)));
		setLocalHints(false);

		const { rowClues: rc, colClues: cc } = computeClues(p);
		setRowClues(rc);
		setColClues(cc);
		setTotalCells(p.flat().filter(Boolean).length);

		const names = Object.values(playersMapRef.current).filter((n) => n !== myName);
		const blank = () => Array.from({ length: size }, () => Array(size).fill(0));
		const initStates = {};
		names.forEach((n) => { initStates[n] = blank(); });
		setOpponentStates(initStates);
		setOpponentSolvedAt({});
	}, [myName]);

	useEffect(() => {
		const room = getRoom();
		if (!room) { navigate("/multiplayer", { state: { view: "join", code: roomCode } }); return; }
		roomRef.current = room;

		room.state.players.onAdd((_player, sessionId) => {
			playersMapRef.current[sessionId] = _player.name;
			setPlayers(Object.values(playersMapRef.current));
		});
		room.state.players.onRemove((_player, sessionId) => {
			delete playersMapRef.current[sessionId];
			setPlayers(Object.values(playersMapRef.current));
		});

		room.onMessage("role", ({ isHost: h }) => {
			setIsHost(h);
			setIsHostState(h);
			if (h) setLobbySettings({ ...guestSettingsRef.current });
		});

		room.onMessage("lobby_settings", (s) => {
			guestSettingsRef.current = s;
			setGuestSettings(s);
		});

		room.onMessage("game_started", ({ settings: s, round, puzzle: p }) => {
			initGame(s, p, round);
			setPhase("playing");
		});

		room.onMessage("player_finished", ({ name, time }) => {
			setFinishedNames((prev) => [...prev, name]);
			if (name !== myName) {
				setOpponentSolvedAt((prev) => ({ ...prev, [name]: time }));
			}
		});

		room.onMessage("round_over", (data) => {
			setRoundData(data);
			setPhase("roundOver");
			setLocalSolved(false);
		});

		room.onMessage("player_cell_update", ({ playerName, row, col, color }) => {
			setOpponentStates((prev) => {
				const current = prev[playerName];
				if (!current) return prev;
				const val = color === "filled" ? 1 : color === "marked" ? 2 : 0;
				const next = current.map((r, ri) =>
					r.map((c, ci) => (ri === row && ci === col ? val : c))
				);
				return { ...prev, [playerName]: next };
			});
		});

		room.onMessage("round_started", ({ round, puzzle: p }) => {
			const size = boardSizeRef.current;
			initGame({ ...settings, boardSize: size }, p, round);
			setRoundData(null);
			setPhase("playing");
		});

		room.onMessage("game_over", ({ leaderboard }) => {
			setFinalLeaderboard(leaderboard);
			setPhase("gameOver");
		});
	}, []);

	// ── Timer ───────────────────────────────────────────────────────────────
	useEffect(() => {
		if (phase !== "playing" || iFinished) return;
		const id = setInterval(() => setSeconds((s) => s + 1), 1000);
		return () => clearInterval(id);
	}, [phase, iFinished]);

	// ── Solve detection ─────────────────────────────────────────────────────
	useEffect(() => {
		if (!localBoard || localSolved || phase !== "playing") return;
		if (!rowClues.length || !colClues.length) return;
		const solved =
			rowClues.every((_, ri) => isRowSat(localBoard, rowClues, ri)) &&
			colClues.every((_, ci) => isColSat(localBoard, colClues, ci));
		if (solved) {
			setLocalSolved(true);
			setIFinished(true);
			roomRef.current?.send("player_finished", { time: seconds });
		}
	}, [localBoard, rowClues, colClues]);

	// ── Board interaction ───────────────────────────────────────────────────
	const handleCellDown = (e, ri, ci) => {
		e.preventDefault();
		if (localSolved) return;
		if (e.button === 2) {
			rightDragRef.current = true;
			setLocalBoard((prev) => {
				if (!prev) return prev;
				const cur = prev[ri][ci];
				const target = cur === 0 ? 2 : 0;
				rightDragMode.current = target;
				if (cur === target) return prev;
				const nb = prev.map((r) => [...r]);
				nb[ri][ci] = target;
				roomRef.current?.send("cell_update", { row: ri, col: ci, color: target === 2 ? "marked" : "" });
				return nb;
			});
			return;
		}
		if (e.button !== 0) return;
		setLocalBoard((prev) => {
			if (!prev) return prev;
			const cur = prev[ri][ci];
			const next = cur === 1 ? 0 : 1; // toggle filled/empty; × cleared too
			setLocalDragFill(next);
			const nb = prev.map((r) => [...r]);
			nb[ri][ci] = next;
			if (next === 1) roomRef.current?.send("cell_update", { row: ri, col: ci, color: "filled" });
			else roomRef.current?.send("cell_update", { row: ri, col: ci, color: "" });
			return nb;
		});
	};

	const handleCellEnter = (ri, ci) => {
		if (localSolved) return;
		if (rightDragRef.current) {
			const target = rightDragMode.current;
			setLocalBoard((prev) => {
				if (!prev || prev[ri][ci] === target) return prev;
				// never overwrite a filled cell during a mark-drag
				if (target === 2 && prev[ri][ci] === 1) return prev;
				const nb = prev.map((r) => [...r]);
				nb[ri][ci] = target;
				roomRef.current?.send("cell_update", { row: ri, col: ci, color: target === 2 ? "marked" : "" });
				return nb;
			});
			return;
		}
		if (localDragFill === null) return;
		setLocalBoard((prev) => {
			if (!prev || prev[ri][ci] === localDragFill) return prev;
			const nb = prev.map((r) => [...r]);
			nb[ri][ci] = localDragFill;
			if (localDragFill === 1) roomRef.current?.send("cell_update", { row: ri, col: ci, color: "filled" });
			else roomRef.current?.send("cell_update", { row: ri, col: ci, color: "" });
			return nb;
		});
	};

	const handleMouseUp = () => {
		setLocalDragFill(null);
		rightDragRef.current = false;
	};

	// Broadcast lobby settings changes to guests
	useEffect(() => {
		if (!isHost || !roomRef.current) return;
		roomRef.current.send("lobby_settings_update", lobbySettings);
	}, [lobbySettings, isHost]);

	// ── Actions ─────────────────────────────────────────────────────────────
	const startGame = () => roomRef.current?.send("start_game", lobbySettings);
	const nextRound = () => roomRef.current?.send("next_round");

	const clearBoard = () => {
		if (localSolved) return;
		const size = boardSizeRef.current;
		const blank = Array.from({ length: size }, () => Array(size).fill(0));
		setLocalBoard(blank);
		// broadcast all cells cleared
		for (let ri = 0; ri < size; ri++) {
			for (let ci = 0; ci < size; ci++) {
				roomRef.current?.send("cell_update", { row: ri, col: ci, color: "" });
			}
		}
	};

	const leaveRoom = () => {
		roomRef.current?.leave();
		clearRoom();
		navigate("/multiplayer");
	};

	const backToLobby = () => {
		setPhase("waiting");
		setPuzzle(null);
		setLocalBoard(null);
		setLocalSolved(false);
		setIFinished(false);
		setFinishedNames([]);
		setOpponentStates({});
		setOpponentSolvedAt({});
		setRoundData(null);
		setFinalLeaderboard([]);
	};

	const copyCode = () => {
		navigator.clipboard.writeText(roomCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	// ── Render: game over ────────────────────────────────────────────────────
	if (phase === "gameOver") {
		return <GameOverScreen leaderboard={finalLeaderboard} onLeave={backToLobby} />;
	}

	const t = dark ? DARK : LIGHT;

	// ── Render: waiting ──────────────────────────────────────────────────────
	if (phase === "waiting") {
		return (
			<div className="min-h-screen flex flex-col relative overflow-hidden"
				style={{ background: t.bg, color: t.text, transition: "background 0.35s, color 0.35s", fontFamily: "Outfit, sans-serif" }}
			>
				<div className="pointer-events-none absolute inset-0" style={{
					backgroundImage: `linear-gradient(${t.gridBg} 1px, transparent 1px), linear-gradient(90deg, ${t.gridBg} 1px, transparent 1px)`,
					backgroundSize: "32px 32px", opacity: dark ? 0.2 : 0.35,
				}} />

				<header className="relative z-10 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: t.border }}>
					<button onClick={leaveRoom}
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
					<button onClick={() => setDark((d) => !d)}
						style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 2, padding: "5px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: t.textDim, cursor: "pointer", letterSpacing: "0.12em" }}
						onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
						onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textDim; }}
					>
						{dark ? "[ light ]" : "[ dark ]"}
					</button>
				</header>

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

						<div style={{ border: `1px solid ${t.accent}40`, borderRadius: 2, padding: "24px 28px", background: t.card, textAlign: "center", position: "relative", overflow: "hidden" }}>
							<div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)` }} />
							<p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: t.textDim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>room code</p>
							<button onClick={copyCode}
								style={{ fontSize: "2.8rem", fontWeight: 700, letterSpacing: "0.22em", color: t.accent, fontFamily: "DM Mono, monospace", lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: 0 }}
								title="click to copy"
							>
								{copied ? "copied!" : roomCode}
							</button>
						</div>

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

						{(() => {
							const vs = isHost ? lobbySettings : guestSettings;
							return (
								<div style={{ border: `1px solid ${t.border}`, borderRadius: 2, overflow: "hidden" }}>
									<div style={{ padding: "8px 14px", background: t.card, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
										<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: t.textDim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
											game settings
										</span>
										{!isHost && <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: t.textDim, letterSpacing: "0.08em" }}>host only</span>}
									</div>
									<div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: t.card }}>
										<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: t.text }}>board visibility</span>
										<button
											onClick={isHost ? () => setLobbySettings((s) => ({ ...s, boardVisibility: !s.boardVisibility })) : undefined}
											style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", padding: "4px 14px", borderRadius: 2, border: `1px solid ${vs.boardVisibility ? t.accent : t.border}`, background: vs.boardVisibility ? t.accent + "20" : "transparent", color: vs.boardVisibility ? t.accent : t.textDim, cursor: isHost ? "pointer" : "default", letterSpacing: "0.08em", transition: "all 0.15s", opacity: isHost ? 1 : 0.6 }}
										>
											{vs.boardVisibility ? "on" : "off"}
										</button>
									</div>
									<div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: t.card, borderTop: `1px solid ${t.border}` }}>
										<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: t.text }}>first to finish</span>
										<div style={{ display: "flex", gap: 4 }}>
											{[1, 2, 3, 4, 5].map((n) => (
												<button key={n}
													onClick={isHost ? () => setLobbySettings((s) => ({ ...s, firstTo: n })) : undefined}
													style={{ width: 30, height: 30, fontFamily: "DM Mono, monospace", fontSize: "0.75rem", borderRadius: 2, border: `1px solid ${vs.firstTo === n ? t.accent : t.border}`, background: vs.firstTo === n ? t.accent + "20" : "transparent", color: vs.firstTo === n ? t.accent : t.textDim, cursor: isHost ? "pointer" : "default", transition: "all 0.15s", opacity: isHost ? 1 : 0.6 }}
												>
													{n}
												</button>
											))}
										</div>
									</div>
									<div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: t.card, borderTop: `1px solid ${t.border}` }}>
										<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: t.text }}>board size</span>
										<div style={{ display: "flex", gap: 4 }}>
											{[5, 10, 15, 20].map((n) => (
												<button key={n}
													onClick={isHost ? () => setLobbySettings((s) => ({ ...s, boardSize: n })) : undefined}
													style={{ width: 34, height: 30, fontFamily: "DM Mono, monospace", fontSize: "0.7rem", borderRadius: 2, border: `1px solid ${vs.boardSize === n ? t.accent : t.border}`, background: vs.boardSize === n ? t.accent + "20" : "transparent", color: vs.boardSize === n ? t.accent : t.textDim, cursor: isHost ? "pointer" : "default", transition: "all 0.15s", opacity: isHost ? 1 : 0.6 }}
												>
													{n}×{n}
												</button>
											))}
										</div>
									</div>
									<div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: t.card, borderTop: `1px solid ${t.border}` }}>
										<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: t.text }}>allow hints</span>
										<button
											onClick={isHost ? () => setLobbySettings((s) => ({ ...s, hints: !s.hints })) : undefined}
											style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", padding: "4px 14px", borderRadius: 2, border: `1px solid ${vs.hints ? t.accent : t.border}`, background: vs.hints ? t.accent + "20" : "transparent", color: vs.hints ? t.accent : t.textDim, cursor: isHost ? "pointer" : "default", letterSpacing: "0.08em", transition: "all 0.15s", opacity: isHost ? 1 : 0.6 }}
										>
											{vs.hints ? "on" : "off"}
										</button>
									</div>
								</div>
							);
						})()}

						{isHost ? (
							<button onClick={startGame}
								style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", padding: "10px 28px", borderRadius: 2, border: `1px solid ${t.accent}`, background: t.accent, color: t.accentFg, cursor: "pointer", letterSpacing: "0.08em", width: "100%" }}
							>
								start game →
							</button>
						) : (
							<p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: t.textDim, textAlign: "center" }}>
								waiting for the host to start…
							</p>
						)}

						<button onClick={leaveRoom}
							style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: t.textDim, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em", padding: 0, textAlign: "center" }}
							onMouseEnter={(e) => (e.currentTarget.style.color = t.text)}
							onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
						>
							cancel lobby
						</button>
					</div>
				</div>
				<style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
			</div>
		);
	}

	// ── Render: playing / roundOver ──────────────────────────────────────────
	const board = localBoard || [];
	const size = settings.boardSize;
	const CELL = Math.max(28, Math.min(42, Math.floor(520 / size)));
	const CLUE_W = Math.max(14, Math.min(24, CELL * 0.62));
	const maxRowLen = rowClues.length ? Math.max(...rowClues.map((c) => c.length)) : 1;
	const maxColLen = colClues.length ? Math.max(...colClues.map((c) => c.length)) : 1;
	const puz = puzzleRef.current;
	const myFilled = board.length && puz ? countCorrect(board, puz) : 0;
	const myColor = playerColor(0);

	return (
		<div
			className="min-h-screen flex flex-col"
			style={{ background: t.bg, color: t.text, userSelect: "none", overflow: "hidden", fontFamily: "Outfit, sans-serif" }}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
		>
			{/* ── Sticky header ── */}
			<header style={{
				borderBottom: `1px solid ${t.border}`,
				background: dark ? "#0b0e1595" : "#f0f2ec95",
				backdropFilter: "blur(8px)",
				position: "sticky", top: 0, zIndex: 20, flexShrink: 0,
			}}>
				{/* Top strip */}
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px", borderBottom: `1px solid ${t.border}` }}>
					<button onClick={leaveRoom}
						style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: t.textDim, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em", transition: "color 0.2s" }}
						onMouseEnter={(e) => (e.currentTarget.style.color = t.accent)}
						onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						leave
					</button>

					<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
						<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: t.textDim, letterSpacing: "0.1em" }}>
							first to {settings.firstTo}
						</span>
						<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.95rem", fontWeight: 600, color: t.text, letterSpacing: "0.06em", minWidth: 50, textAlign: "center" }}>
							{formatTime(seconds)}
						</span>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						{settings.hints && (
							<button
								onClick={() => setLocalHints((h) => !h)}
								style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", padding: "3px 10px", borderRadius: 2, border: `1px solid ${localHints ? t.accent : t.border}`, background: localHints ? t.accent + "20" : "transparent", color: localHints ? t.accent : t.textDim, cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.15s" }}
							>
								hints
							</button>
						)}
						<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: t.textDim, letterSpacing: "0.08em" }}>
							{inGameVisible ? "boards on" : "boards off"}
						</span>
					</div>
				</div>

				{/* Score cards */}
				<div style={{ display: "grid", gridTemplateColumns: `repeat(${sortedPlayers.length}, 1fr)` }}>
					{sortedPlayers.map((name, i) => {
						const color = playerColor(i);
						const isMe = name === myName;
						const filled = isMe ? myFilled : countCorrect(opponentStates[name] || [], puz);
						const pct = totalCells > 0 ? Math.round((filled / totalCells) * 100) : 0;
						const solved = isMe ? localSolved : finishedNames.includes(name);
						return (
							<div key={name} style={{
								padding: "10px 16px",
								borderRight: i < sortedPlayers.length - 1 ? `1px solid ${t.border}` : "none",
								background: isMe ? (dark ? "#a3ff6e08" : "#3d8a1e08") : "transparent",
								position: "relative",
							}}>
								{isMe && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />}
								<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
									<div style={{ width: 7, height: 7, borderRadius: "50%", background: solved ? color : t.border, boxShadow: solved ? `0 0 6px ${color}` : "none", transition: "all 0.3s", flexShrink: 0 }} />
									<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: isMe ? t.text : t.textMuted, letterSpacing: "0.04em", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
										{name}{isMe ? " (you)" : ""}
									</span>
									<span style={{ fontFamily: "DM Mono, monospace", fontSize: "1rem", fontWeight: 700, color, lineHeight: 1 }}>0</span>
								</div>
								<ProgressBar value={filled} max={totalCells} color={color} t={t} />
								<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: t.textDim, marginTop: 3, display: "block" }}>
									{pct}% filled
								</span>
							</div>
						);
					})}
				</div>
			</header>

			{/* ── Game area ── */}
			<div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

				{/* Your board */}
				<div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 16px 16px", borderRight: `1px solid ${t.border}`, overflow: "auto" }}>
					<div style={{ marginBottom: 8, alignSelf: "flex-start", paddingLeft: CLUE_W * maxRowLen }}>
						<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: t.textDim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
							your board
						</span>
					</div>

					{/* Nonogram grid */}
					<div style={{ display: "flex", flexDirection: "column", position: "relative" }}>

					{/* Solved overlay — shown while waiting for others */}
					{localSolved && phase === "playing" && sortedPlayers.filter(n => n !== myName).some(n => !finishedNames.includes(n)) && (
						<div style={{
							position: "absolute", inset: 0, zIndex: 10,
							background: dark ? "rgba(9,11,16,0.82)" : "rgba(240,242,236,0.82)",
							backdropFilter: "blur(4px)",
							display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
						}}>
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
								<circle cx="12" cy="12" r="10" stroke={myColor} strokeWidth="1.5" />
								<path d="M7 12.5l3.5 3.5 6.5-7" stroke={myColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
							<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: myColor, letterSpacing: "0.12em" }}>board complete</span>
							<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: t.textDim, letterSpacing: "0.08em" }}>waiting for others...</span>
						</div>
					)}
						{/* Col clues */}
						<div style={{ display: "flex", marginLeft: CLUE_W * maxRowLen }}>
							{colClues.map((clues, ci) => (
								<div key={ci} style={{ width: CELL, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: CLUE_W * maxColLen, paddingBottom: 4, gap: 1 }}>
									{clues.map((n, k) => (
										<span key={k} style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: localHints && board.length && isColSat(board, colClues, ci) ? myColor : t.textDim, lineHeight: 1, transition: "color 0.2s" }}>
											{n}
										</span>
									))}
								</div>
							))}
						</div>

						{/* Rows */}
						{board.map((row, ri) => (
							<div key={ri} style={{ display: "flex" }}>
								{/* Row clues */}
								<div style={{ width: CLUE_W * maxRowLen, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6, gap: 4, height: CELL }}>
									{rowClues[ri]?.map((n, k) => (
										<span key={k} style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: localHints && isRowSat(board, rowClues, ri) ? myColor : t.textDim, minWidth: CLUE_W - 4, textAlign: "right", transition: "color 0.2s" }}>
											{n}
										</span>
									))}
								</div>
								{/* Cells */}
								{row.map((cell, ci) => {
									const isMajorV = size > 5 && ci % 5 === 0 && ci !== 0;
									const isMajorH = size > 5 && ri % 5 === 0 && ri !== 0;
									return (
										<div
											key={ci}
											onMouseDown={(e) => handleCellDown(e, ri, ci)}
											onMouseEnter={() => handleCellEnter(ri, ci)}
											onContextMenu={(e) => e.preventDefault()}
											style={{
												width: CELL, height: CELL, boxSizing: "border-box",
												borderTop: `${isMajorH ? 2 : 1}px solid ${isMajorH ? t.gridLineBold : t.gridLine}`,
												borderLeft: `${isMajorV ? 2 : 1}px solid ${isMajorV ? t.gridLineBold : t.gridLine}`,
												borderRight: ci === size - 1 ? `1px solid ${t.gridLine}` : "none",
												borderBottom: ri === size - 1 ? `1px solid ${t.gridLine}` : "none",
												background: cell === 1 ? myColor : t.card,
												cursor: localSolved ? "default" : "pointer",
												display: "flex", alignItems: "center", justifyContent: "center",
												transition: "background 0.06s",
											}}
										>
											{cell === 2 && (
												<svg width={CELL * 0.36} height={CELL * 0.36} viewBox="0 0 12 12" fill="none">
													<path d="M2 2l8 8M10 2L2 10" stroke="#ff5555" strokeWidth="1.5" strokeLinecap="round" />
												</svg>
											)}
										</div>
									);
								})}
							</div>
						))}
					</div>

					{/* Hints + clear */}
					<div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 20 }}>
						{[["click", "fill"], ["right click", "×"]].map(([k, v]) => (
							<span key={k} style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: t.textDim }}>
								<span style={{ color: t.textMuted }}>{k}</span> — {v}
							</span>
						))}
						{!localSolved && (
							<button
								onClick={clearBoard}
								style={{ marginLeft: "auto", fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: t.textDim, background: "none", border: `1px solid ${t.border}`, borderRadius: 2, padding: "3px 10px", cursor: "pointer", letterSpacing: "0.06em" }}
								onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ff6e6e80"; e.currentTarget.style.color = "#ff8080"; }}
								onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textDim; }}
							>
								clear
							</button>
						)}
					</div>
				</div>

				{/* Opponent sidebar */}
				<div style={{ width: 220, display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
					<div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}` }}>
						<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: t.textDim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
							opponents
						</span>
					</div>
					{sortedPlayers.slice(1).map((name, i) => {
						const color = playerColor(i + 1);
						const oppBoard = opponentStates[name] || Array.from({ length: size }, () => Array(size).fill(0));
						const filled = countCorrect(oppBoard, puz);
						const pct = totalCells > 0 ? Math.round((filled / totalCells) * 100) : 0;
						const solved = finishedNames.includes(name);
						return (
							<div key={name} style={{ padding: "14px", borderBottom: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
								<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
									<div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
									<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: t.textMuted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
										{name}
									</span>
									<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color, fontWeight: 600 }}>{pct}%</span>
								</div>
								<MiniBoard
									board={oppBoard}
									visible={inGameVisible}
									solved={solved}
									solvedTime={opponentSolvedAt[name] ?? null}
									t={t}
									playerColor={color}
									size={size}
								/>
								<ProgressBar value={filled} max={totalCells} color={color} t={t} />
							</div>
						);
					})}
				</div>
			</div>

			{/* Round over overlay */}
			{phase === "roundOver" && roundData && (
				<RoundOverOverlay {...roundData} isHost={isHost} onNext={nextRound} />
			)}
		</div>
	);
}

export default MultiplayerLobby;
