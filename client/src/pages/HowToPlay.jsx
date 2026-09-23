import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DARK, LIGHT } from "../theme";
import { useTheme } from "../useTheme";

// ── Demo puzzle (ring shape) ───────────────────────────────────────────────────

const DEMO_SOLUTION = [
	[0, 1, 1, 1, 0],
	[1, 0, 0, 0, 1],
	[1, 0, 0, 0, 1],
	[1, 0, 0, 0, 1],
	[0, 1, 1, 1, 0],
];

function computeClues(sol) {
	const row = sol.map((r) => {
		const c = []; let run = 0;
		for (const v of r) { if (v) run++; else if (run) { c.push(run); run = 0; } }
		if (run) c.push(run);
		return c.length ? c : [0];
	});
	const col = Array.from({ length: sol[0].length }, (_, ci) => {
		const c = []; let run = 0;
		for (let ri = 0; ri < sol.length; ri++) {
			if (sol[ri][ci]) run++; else if (run) { c.push(run); run = 0; }
		}
		if (run) c.push(run);
		return c.length ? c : [0];
	});
	return { row, col };
}

const DEMO_CLUES = computeClues(DEMO_SOLUTION);

function InteractivePuzzle({ t, accent }) {
	const [board, setBoard] = useState(() => Array.from({ length: 5 }, () => Array(5).fill(0)));
	const [dragFill, setDragFill] = useState(null);

	const isSolved = board.every((row, ri) =>
		row.every((c, ci) => (c === 1) === (DEMO_SOLUTION[ri][ci] === 1))
	);

	const isRowSat = (ri) => {
		const runs = []; let run = 0;
		for (const c of board[ri]) { if (c === 1) run++; else if (run) { runs.push(run); run = 0; } }
		if (run) runs.push(run);
		return JSON.stringify(runs) === JSON.stringify(DEMO_CLUES.row[ri]);
	};
	const isColSat = (ci) => {
		const runs = []; let run = 0;
		for (let ri = 0; ri < 5; ri++) {
			if (board[ri][ci] === 1) run++; else if (run) { runs.push(run); run = 0; }
		}
		if (run) runs.push(run);
		return JSON.stringify(runs) === JSON.stringify(DEMO_CLUES.col[ci]);
	};

	const cycle = (c) => c === 0 ? 1 : c === 1 ? 2 : 0;

	const touch = (ri, ci, fill) => {
		setBoard((prev) => {
			const nb = prev.map((r) => [...r]);
			nb[ri][ci] = fill !== undefined ? fill : cycle(prev[ri][ci]);
			return nb;
		});
	};

	const CELL = 44;

	return (
		<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
			<div style={{ userSelect: "none" }} onMouseUp={() => setDragFill(null)} onMouseLeave={() => setDragFill(null)}>
				{/* Col clues */}
				<div style={{ display: "flex", marginLeft: CELL * 1.4 }}>
					{DEMO_CLUES.col.map((clues, ci) => (
						<div key={ci} style={{ width: CELL, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: CELL * 0.9, paddingBottom: 4, gap: 2 }}>
							{clues.map((n, i) => (
								<span key={i} style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: isColSat(ci) ? accent : t.textDim, transition: "color 0.2s", lineHeight: 1 }}>{n}</span>
							))}
						</div>
					))}
				</div>
				{/* Rows */}
				{board.map((row, ri) => (
					<div key={ri} style={{ display: "flex" }}>
						<div style={{ width: CELL * 1.4, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, gap: 4, height: CELL }}>
							{DEMO_CLUES.row[ri].map((n, i) => (
								<span key={i} style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: isRowSat(ri) ? accent : t.textDim, transition: "color 0.2s" }}>{n}</span>
							))}
						</div>
						{row.map((cell, ci) => (
							<div
								key={ci}
								onMouseDown={() => { const f = cycle(cell); setDragFill(f); touch(ri, ci, f); }}
								onMouseEnter={() => { if (dragFill !== null) touch(ri, ci, dragFill); }}
								onContextMenu={(e) => { e.preventDefault(); touch(ri, ci, cell === 2 ? 0 : 2); }}
								style={{ width: CELL, height: CELL, boxSizing: "border-box", border: `1px solid ${t.gridLine}`, background: cell === 1 ? accent : t.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.07s" }}
							>
								{cell === 2 && (
									<svg width="16" height="16" viewBox="0 0 12 12" fill="none">
										<path d="M2 2l8 8M10 2L2 10" stroke="#ff5555" strokeWidth="1.5" strokeLinecap="round" />
									</svg>
								)}
							</div>
						))}
					</div>
				))}
			</div>

			<div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
				{isSolved ? (
					<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: accent, letterSpacing: "0.1em" }}>
						✓ you got it!
					</span>
				) : (
					<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: t.textDim, letterSpacing: "0.06em" }}>
						click to fill · right-click to mark ×
					</span>
				)}
			</div>

			<button
				onClick={() => setBoard(Array.from({ length: 5 }, () => Array(5).fill(0)))}
				style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: t.textDim, background: "none", border: `1px solid ${t.border}`, borderRadius: 2, padding: "4px 16px", cursor: "pointer", letterSpacing: "0.08em" }}
				onMouseEnter={(e) => (e.currentTarget.style.color = t.text)}
				onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
			>
				reset
			</button>
		</div>
	);
}

export default function HowToPlay() {
	const navigate = useNavigate();
	const [dark, setDark] = useTheme();
	const t = dark ? DARK : LIGHT;
	const accent = t.accent;

	return (
		<div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: t.bg, color: t.text, transition: "background 0.35s, color 0.35s", fontFamily: "Outfit, sans-serif" }}>
			{/* Grid bg */}
			<div className="pointer-events-none fixed inset-0 z-0" style={{
				backgroundImage: `linear-gradient(${t.gridBg} 1px, transparent 1px), linear-gradient(90deg, ${t.gridBg} 1px, transparent 1px)`,
				backgroundSize: "32px 32px",
				opacity: dark ? 0.18 : 0.32,
			}} />

			{/* Header */}
			<header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: t.border, background: dark ? "#090b10e8" : "#f4f5f0e8", backdropFilter: "blur(10px)" }}>
				<button
					onClick={() => navigate("/")}
					style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: t.textDim, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em", padding: 0, transition: "color 0.2s" }}
					onMouseEnter={(e) => (e.currentTarget.style.color = accent)}
					onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					back
				</button>
				<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
					how to play
				</span>
				<button
					onClick={() => setDark((d) => !d)}
					style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 2, padding: "5px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: t.textDim, cursor: "pointer", letterSpacing: "0.12em" }}
					onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
					onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textDim; }}
				>
					{dark ? "[ light ]" : "[ dark ]"}
				</button>
			</header>

			{/* Body */}
			<div className="relative z-10 flex-1 flex justify-center px-6 py-12">
				<div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 40 }}>

					{/* Title */}
					<div>
						<h1 style={{ fontSize: "2rem", fontWeight: 700, color: t.text, margin: "0 0 8px", letterSpacing: "-0.02em" }}>How to play Nonograms</h1>
						<p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: t.textDim, margin: 0, lineHeight: 1.7 }}>
							fill the grid so every row and column matches its number clues.
						</p>
					</div>

					{/* Rule 1 */}
					<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
						<h2 style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: accent, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
							01 — the numbers
						</h2>
						<p style={{ fontSize: "0.95rem", color: t.text, margin: 0, lineHeight: 1.7 }}>
							Each number tells you how many cells to fill <em>in a row</em>.
						</p>
						{/* Visual example */}
						<div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", border: `1px solid ${t.border}`, borderRadius: 2, background: t.card, flexWrap: "wrap" }}>
							<span style={{ fontFamily: "DM Mono, monospace", fontSize: "1.1rem", fontWeight: 600, color: accent, minWidth: 32 }}>3</span>
							<div style={{ display: "flex", gap: 3 }}>
								{[1,1,1,0,0].map((on, i) => (
									<div key={i} style={{ width: 34, height: 34, background: on ? accent : t.bg, border: `1px solid ${t.gridLine}`, borderRadius: 1 }} />
								))}
							</div>
							<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: t.textDim }}>3 filled cells in a row</span>
						</div>
					</div>

					{/* Rule 2 */}
					<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
						<h2 style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: accent, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
							02 — multiple numbers
						</h2>
						<p style={{ fontSize: "0.95rem", color: t.text, margin: 0, lineHeight: 1.7 }}>
							Multiple numbers mean multiple groups, always left to right (or top to bottom for columns), with at least one empty cell between each group.
						</p>
						<div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", border: `1px solid ${t.border}`, borderRadius: 2, background: t.card, flexWrap: "wrap" }}>
							<span style={{ fontFamily: "DM Mono, monospace", fontSize: "1.1rem", fontWeight: 600, color: accent, minWidth: 48 }}>3  1</span>
							<div style={{ display: "flex", gap: 3 }}>
								{[1,1,1,0,1].map((on, i) => (
									<div key={i} style={{ width: 34, height: 34, background: on ? accent : t.bg, border: `1px solid ${t.gridLine}`, borderRadius: 1 }} />
								))}
							</div>
							<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: t.textDim }}>3 filled, gap, 1 filled</span>
						</div>
					</div>

					{/* Rule 3 */}
					<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
						<h2 style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: accent, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
							03 — rows and columns
						</h2>
						<p style={{ fontSize: "0.95rem", color: t.text, margin: 0, lineHeight: 1.7 }}>
							Every row has its own clues on the left. Every column has its own clues on top. A cell must satisfy <em>both</em> its row clue and its column clue.
						</p>
						<p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: t.textDim, margin: 0, lineHeight: 1.7, padding: "12px 16px", border: `1px solid ${t.border}`, borderRadius: 2, background: t.card }}>
							tip: start with rows or columns where the numbers leave little room — those are easiest to place first.
						</p>
					</div>

					{/* Try it */}
					<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
						<h2 style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: accent, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
							04 — try it
						</h2>
						<p style={{ fontSize: "0.95rem", color: t.text, margin: 0, lineHeight: 1.7 }}>
							Solve the puzzle below. Numbers turn green when that line is correct.
						</p>
						<div style={{ padding: "28px 24px", border: `1px solid ${t.border}`, borderRadius: 2, background: t.card, display: "flex", justifyContent: "center", position: "relative" }}>
							<div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}50, transparent)` }} />
							<InteractivePuzzle t={t} accent={accent} />
						</div>
					</div>

					{/* Controls */}
					<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
						<h2 style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: accent, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
							05 — controls
						</h2>
						<div style={{ border: `1px solid ${t.border}`, borderRadius: 2, overflow: "hidden" }}>
							{[
								["left click", "fill a cell (click again to clear)"],
								["right click", "mark × (to note an empty cell)"],
								["click + drag", "fill multiple cells at once"],
							].map(([input, action], i, arr) => (
								<div key={i} style={{ display: "flex", alignItems: "center", padding: "11px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : "none", background: t.card, gap: 24 }}>
									<code style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: accent, minWidth: 110 }}>{input}</code>
									<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: t.textDim }}>{action}</span>
								</div>
							))}
						</div>
					</div>

					{/* CTA */}
					<div style={{ display: "flex", gap: 10, paddingBottom: 32 }}>
						<button
							onClick={() => navigate("/play")}
							style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", padding: "11px 28px", borderRadius: 2, border: `1px solid ${accent}`, background: accent, color: t.accentFg, cursor: "pointer", letterSpacing: "0.08em", transition: "opacity 0.15s" }}
							onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
							onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
						>
							start playing →
						</button>
						<button
							onClick={() => navigate("/")}
							style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", padding: "11px 28px", borderRadius: 2, border: `1px solid ${t.border}`, background: "transparent", color: t.textMuted, cursor: "pointer", letterSpacing: "0.08em" }}
							onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
							onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
						>
							back to menu
						</button>
					</div>

				</div>
			</div>

			<style>{`
				@keyframes fadeUp {
					from { opacity: 0; transform: translateY(8px); }
					to   { opacity: 1; transform: translateY(0); }
				}
			`}</style>
		</div>
	);
}
