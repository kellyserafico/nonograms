import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DARK, LIGHT } from "../theme";

// ── Puzzle library ────────────────────────────────────────────────────────────

function computeClues(solution) {
	const rows = solution.length;
	const cols = solution[0].length;
	const rowClues = solution.map((row) => {
		const clues = [];
		let run = 0;
		for (const c of row) { if (c) run++; else if (run) { clues.push(run); run = 0; } }
		if (run) clues.push(run);
		return clues.length ? clues : [0];
	});
	const colClues = Array.from({ length: cols }, (_, ci) => {
		const clues = [];
		let run = 0;
		for (let ri = 0; ri < rows; ri++) {
			if (solution[ri][ci]) run++;
			else if (run) { clues.push(run); run = 0; }
		}
		if (run) clues.push(run);
		return clues.length ? clues : [0];
	});
	return { rowClues, colClues };
}

function getPuzzle(size) {
	const solution = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => (Math.random() < 0.55 ? 1 : 0))
	);
	return { solution, ...computeClues(solution) };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyBoard(size) {
	return Array.from({ length: size }, () => Array(size).fill(0));
}

function formatTime(s) {
	return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function checkSolved(board, solution) {
	return board.every((row, ri) =>
		row.every((cell, ci) => (cell === 1) === (solution[ri][ci] === 1))
	);
}

function runsMatch(cells, clues) {
	const runs = [];
	let run = 0;
	for (const c of cells) { if (c === 1) run++; else if (run) { runs.push(run); run = 0; } }
	if (run) runs.push(run);
	return JSON.stringify(runs) === JSON.stringify(clues.filter((x) => x > 0));
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SinglePlayer() {
	const navigate = useNavigate();
	const [dark, setDark] = useState(true);
	const [size, setSize] = useState(10);
	const [sizeInput, setSizeInput] = useState("10");
	const [puzzle, setPuzzle] = useState(() => getPuzzle(10));
	const [board, setBoard] = useState(() => emptyBoard(10));
	const [seconds, setSeconds] = useState(0);
	const [running, setRunning] = useState(true);
	const [solved, setSolved] = useState(false);
	const [dragFill, setDragFill] = useState(null);
	const intervalRef = useRef(null);
	const rightDragRef = useRef(false);   // true while right button is held
	const rightMovedRef = useRef(false);  // true if mouse moved during right drag
	const rightDragMode = useRef(0);      // value to paint during right drag (2=×, 0=clear)

	const t = dark ? DARK : LIGHT;

	useEffect(() => {
		if (running && !solved) {
			intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
		}
		return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
	}, [running, solved]);

	const startNewPuzzle = useCallback((n) => {
		setSize(n);
		setPuzzle(getPuzzle(n));
		setBoard(emptyBoard(n));
		setSeconds(0);
		setRunning(true);
		setSolved(false);
	}, []);

	const handleGenerate = () => {
		const n = Math.min(25, Math.max(3, parseInt(sizeInput, 10) || 10));
		setSizeInput(String(n));
		startNewPuzzle(n);
	};

	const handleClear = () => {
		setBoard(emptyBoard(size));
		setSolved(false);
		setSeconds(0);
		setRunning(true);
	};

	const handleCellRightClick = (e) => {
		e.preventDefault(); // just suppress the browser context menu; logic is in mousedown
	};

	const handleMouseDown = (ri, ci, e) => {
		if (solved) return;
		if (e.button === 2) {
			rightDragRef.current = true;
			rightMovedRef.current = false;
			// apply to the starting cell and set drag mode from actual current state
			setBoard((prev) => {
				const cur = prev[ri][ci];
				// empty → place ×; filled or × → clear
				const target = cur === 0 ? 2 : 0;
				rightDragMode.current = target;
				if (cur === target) return prev;
				const nb = prev.map((r) => [...r]);
				nb[ri][ci] = target;
				return nb;
			});
			return;
		}
		if (e.button !== 0) return;
		const current = board[ri][ci];
		const next = current === 1 ? 0 : 1; // toggle filled/empty; × cleared too
		setDragFill(next);
		setBoard((prev) => {
			const nb = prev.map((r) => [...r]);
			nb[ri][ci] = next;
			if (checkSolved(nb, puzzle.solution)) { setSolved(true); setRunning(false); }
			return nb;
		});
	};

	const handleMouseEnter = (ri, ci) => {
		if (solved) return;
		if (rightDragRef.current) {
			rightMovedRef.current = true;
			const target = rightDragMode.current;
			setBoard((prev) => {
				if (prev[ri][ci] === target) return prev;
				const nb = prev.map((r) => [...r]);
				nb[ri][ci] = target;
				return nb;
			});
			return;
		}
		if (dragFill === null) return;
		setBoard((prev) => {
			if (prev[ri][ci] === dragFill) return prev;
			const nb = prev.map((r) => [...r]);
			nb[ri][ci] = dragFill;
			if (checkSolved(nb, puzzle.solution)) { setSolved(true); setRunning(false); }
			return nb;
		});
	};

	const handleMouseUp = () => {
		setDragFill(null);
		rightDragRef.current = false;
	};

	const isRowSatisfied = (ri) => runsMatch(board[ri], puzzle.rowClues[ri]);
	const isColSatisfied = (ci) => runsMatch(board.map((r) => r[ci]), puzzle.colClues[ci]);

	const maxRowClueLen = Math.max(...puzzle.rowClues.map((c) => c.length));
	const maxColClueLen = Math.max(...puzzle.colClues.map((c) => c.length));
	const CELL = Math.max(28, Math.min(56, Math.floor(560 / size)));
	const CLUE_NUM_W = Math.max(14, Math.min(22, CELL * 0.38)); // per-number slot width for row clues
	const ROW_CLUE_W = CLUE_NUM_W * maxRowClueLen + 12;         // total row clue area width
	const COL_CLUE_H = Math.max(14, CELL * 0.38);               // per-number height for col clues
	const FONT = CELL <= 30 ? "0.72rem" : "0.9rem";

	return (
		<div
			className="min-h-screen flex flex-col relative"
			style={{
				background: t.bg, color: t.text,
				transition: "background 0.35s, color 0.35s",
				userSelect: "none", overflowX: "hidden",
			}}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
		>
			{/* Grid bg */}
			<div className="pointer-events-none absolute inset-0" style={{
				backgroundImage: `linear-gradient(${t.gridBg} 1px, transparent 1px), linear-gradient(90deg, ${t.gridBg} 1px, transparent 1px)`,
				backgroundSize: "32px 32px",
				opacity: dark ? 0.2 : 0.35,
			}} />

			{/* ── Top bar ── */}
			<header
				className="relative z-10 flex items-center justify-between px-6 py-4 border-b"
				style={{ borderColor: t.border }}
			>
				<button
					onClick={() => navigate("/")}
					className="flex items-center gap-2"
					style={{
						fontFamily: "DM Mono, monospace", fontSize: "0.72rem",
						color: t.textDim, letterSpacing: "0.06em",
						background: "none", border: "none", cursor: "pointer", padding: 0,
					}}
					onMouseEnter={(e) => (e.currentTarget.style.color = t.accent)}
					onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					back
				</button>

				<span style={{
					fontFamily: "DM Mono, monospace", fontSize: "0.72rem",
					color: t.accent, letterSpacing: "0.2em", textTransform: "uppercase",
				}}>
					nonogram / solo
				</span>

				<button
					onClick={() => setDark((d) => !d)}
					style={{
						background: "transparent", border: `1px solid ${t.border}`, borderRadius: 2,
						padding: "5px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
						color: t.textDim, cursor: "pointer", letterSpacing: "0.12em",
					}}
					onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
					onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textDim; }}
				>
					{dark ? "[ light ]" : "[ dark ]"}
				</button>
			</header>

			{/* ── Centered main ── */}
			<div className="relative z-10 flex-1 flex flex-col items-center justify-center py-10 px-4 overflow-auto">

				{/* Timer above board */}
				<div style={{
					fontFamily: "DM Mono, monospace",
					fontSize: "2.8rem",
					fontWeight: 300,
					letterSpacing: "0.14em",
					color: solved ? t.accent : t.textDim,
					transition: "color 0.3s",
					marginBottom: 28,
				}}>
					{formatTime(seconds)}
				</div>

				{/* Board — visual shift so cells (not clues) are centered on the page */}
				<div style={{ display: "flex", flexDirection: "column", transform: `translateX(-${Math.floor(ROW_CLUE_W / 2)}px)` }}>
					{/* Col clues — spacer on left so numbers sit above cells */}
					<div style={{ display: "flex", flexDirection: "row" }}>
						<div style={{ width: ROW_CLUE_W, flexShrink: 0 }} />
						{puzzle.colClues.map((clues, ci) => {
							const sat = isColSatisfied(ci);
							return (
								<div key={ci} style={{
									width: CELL, display: "flex", flexDirection: "column",
									alignItems: "center", justifyContent: "flex-end",
									height: COL_CLUE_H * maxColClueLen + 8, paddingBottom: 6, gap: 5,
								}}>
									{clues.map((n, i) => (
										<span key={i} style={{
											fontFamily: "DM Mono, monospace", fontSize: FONT,
											color: sat ? t.accent : n === 0 ? t.textDim : t.text,
											lineHeight: 1, transition: "color 0.2s",
										}}>
											{n}
										</span>
									))}
								</div>
							);
						})}
					</div>

					{/* Grid rows */}
					{board.map((row, ri) => {
						const sat = isRowSatisfied(ri);
						return (
							<div key={ri} style={{ display: "flex", flexDirection: "row" }}>
								{/* Row clues */}
								<div style={{
									width: ROW_CLUE_W,
									display: "flex", flexDirection: "row",
									alignItems: "center", justifyContent: "flex-end",
									paddingRight: 8, gap: 3, height: CELL,
								}}>
									{puzzle.rowClues[ri].map((n, i) => (
										<span key={i} style={{
											fontFamily: "DM Mono, monospace", fontSize: FONT,
											color: sat ? t.accent : n === 0 ? t.textDim : t.text,
											transition: "color 0.2s",
											minWidth: CLUE_NUM_W, textAlign: "right",
										}}>
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
											onMouseDown={(e) => handleMouseDown(ri, ci, e)}
											onMouseEnter={() => handleMouseEnter(ri, ci)}
											onContextMenu={handleCellRightClick}
											style={{
												width: CELL, height: CELL, boxSizing: "border-box",
												borderTop: `${isMajorH ? 2 : 1}px solid ${isMajorH ? t.gridLineBold : t.gridLine}`,
												borderLeft: `${isMajorV ? 2 : 1}px solid ${isMajorV ? t.gridLineBold : t.gridLine}`,
												borderRight: ci === size - 1 ? `1px solid ${t.gridLine}` : "none",
												borderBottom: ri === size - 1 ? `1px solid ${t.gridLine}` : "none",
												background: cell === 1 ? t.accent : t.card,
												cursor: solved ? "default" : "pointer",
												display: "flex", alignItems: "center", justifyContent: "center",
												transition: "background 0.08s",
											}}
										>
											{cell === 2 && (
												<svg width={CELL * 0.38} height={CELL * 0.38} viewBox="0 0 12 12" fill="none">
													<path d="M2 2l8 8M10 2L2 10" stroke={t.textDim} strokeWidth="1.5" strokeLinecap="round" />
												</svg>
											)}
										</div>
									);
								})}
							</div>
						);
					})}
				</div>

				{/* Controls below board */}
				<div style={{
					display: "flex", alignItems: "center", gap: 12,
					marginTop: 36, flexWrap: "wrap", justifyContent: "center",
				}}>
					<span style={{
						fontFamily: "DM Mono, monospace", fontSize: "0.8rem",
						color: t.textDim, letterSpacing: "0.12em", textTransform: "uppercase",
					}}>
						size
					</span>
					<input
						type="number"
						min={3}
						max={25}
						value={sizeInput}
						onChange={(e) => setSizeInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
						style={{
							width: 72, background: "transparent",
							border: `1px solid ${t.border}`, borderRadius: 2,
							padding: "10px 12px", fontFamily: "DM Mono, monospace",
							fontSize: "1rem", color: t.text, textAlign: "center", outline: "none",
						}}
					/>
					<button
						onClick={handleGenerate}
						style={{
							fontFamily: "DM Mono, monospace", fontSize: "0.88rem",
							padding: "10px 28px", borderRadius: 2,
							border: `1px solid ${t.accent}`,
							background: t.accent, color: t.accentFg,
							cursor: "pointer", letterSpacing: "0.08em",
						}}
						onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
						onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
					>
						generate
					</button>
					<button
						onClick={handleClear}
						style={{
							fontFamily: "DM Mono, monospace", fontSize: "0.88rem",
							padding: "10px 28px", borderRadius: 2,
							border: `1px solid ${t.border}`,
							background: "transparent", color: t.textDim,
							cursor: "pointer", letterSpacing: "0.08em",
						}}
						onMouseEnter={(e) => { e.currentTarget.style.borderColor = dark ? "#ff6e6e" : "#cc3322"; e.currentTarget.style.color = dark ? "#ff8080" : "#cc3322"; }}
						onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textDim; }}
					>
						clear
					</button>
				</div>

			</div>

			{/* ── Hint bar ── */}
			<div
				className="relative z-10 border-t flex items-center justify-center gap-8 px-6 py-3"
				style={{ borderColor: t.border }}
			>
				{[
					["left click / drag", "fill → mark (×) → clear"],
					["right click", "empty cell → × — filled cell → clear"],
				].map(([key, label]) => (
					<span key={key} style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: t.textDim }}>
						<span style={{ color: t.text }}>{key}</span> — {label}
					</span>
				))}
			</div>

			{/* ── Solved overlay ── */}
			{solved && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center"
					style={{ background: dark ? "#090b10cc" : "#f4f5f0cc", backdropFilter: "blur(6px)", animation: "fadeIn 0.3s ease" }}
					onClick={() => setSolved(false)}
				>
					<div
						className="flex flex-col items-center gap-6 p-12"
						style={{
							background: t.card, border: `1px solid ${t.accent}40`,
							borderRadius: 2, minWidth: 320,
							boxShadow: `0 0 60px ${t.accent}18`,
							animation: "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: t.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
							— solved —
						</span>
						<div style={{ textAlign: "center" }}>
							<div style={{ fontSize: "3rem", fontWeight: 700, letterSpacing: "-0.03em", color: t.text, lineHeight: 1 }}>
								{formatTime(seconds)}
							</div>
							<div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: t.textDim, marginTop: 6 }}>
								{size}×{size} puzzle complete
							</div>
						</div>
						<div className="flex gap-3">
							<button
								onClick={handleClear}
								style={{
									fontFamily: "DM Mono, monospace", fontSize: "0.7rem",
									padding: "8px 20px", borderRadius: 2,
									border: `1px solid ${t.border}`,
									background: "transparent", color: t.textMuted,
									cursor: "pointer", letterSpacing: "0.08em",
								}}
							>
								retry
							</button>
							<button
								onClick={() => startNewPuzzle(size)}
								style={{
									fontFamily: "DM Mono, monospace", fontSize: "0.7rem",
									padding: "8px 20px", borderRadius: 2,
									border: `1px solid ${t.accent}`,
									background: t.accent, color: t.accentFg,
									cursor: "pointer", letterSpacing: "0.08em",
								}}
							>
								new puzzle →
							</button>
						</div>
					</div>
				</div>
			)}

			<style>{`
				@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
				@keyframes scaleIn { from { opacity: 0; transform: scale(0.92) } to { opacity: 1; transform: scale(1) } }
			`}</style>
		</div>
	);
}
