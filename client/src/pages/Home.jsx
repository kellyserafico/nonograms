import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DARK, LIGHT } from "../theme";
import { useTheme } from "../useTheme";

// ── Animated nonogram preview ────────────────────────────────────────────────
const SIZE = 5;

function makeRandomPuzzle() {
	return Array.from({ length: SIZE }, () =>
		Array.from({ length: SIZE }, () => Math.random() < 0.55)
	);
}

function calcClues(puzzle) {
	const rowClues = puzzle.map((row) => {
		let clues = [], cnt = 0;
		row.forEach((c) => { if (c) cnt++; else if (cnt) { clues.push(cnt); cnt = 0; } });
		if (cnt) clues.push(cnt);
		return clues.length ? clues : [0];
	});
	const colClues = Array.from({ length: SIZE }, (_, ci) => {
		let clues = [], cnt = 0;
		for (let ri = 0; ri < SIZE; ri++) {
			if (puzzle[ri][ci]) cnt++;
			else if (cnt) { clues.push(cnt); cnt = 0; }
		}
		if (cnt) clues.push(cnt);
		return clues.length ? clues : [0];
	});
	return { rowClues, colClues };
}

function NonogramPreview({ t }) {
	const [puzzle, setPuzzle] = useState(() => makeRandomPuzzle());
	const [litCells, setLitCells] = useState(new Set());
	const frameRef = useRef(null);

	const runAnimation = (currentPuzzle) => {
		const cells = [];
		for (let r = 0; r < SIZE; r++)
			for (let c = 0; c < SIZE; c++)
				if (currentPuzzle[r][c]) cells.push(`${r}-${c}`);

		let i = 0;
		let running = true;

		const fill = () => {
			if (!running) return;
			if (i < cells.length) {
				setLitCells((prev) => new Set([...prev, cells[i]]));
				i++;
				frameRef.current = setTimeout(fill, 160);
			} else {
				frameRef.current = setTimeout(() => {
					if (!running) return;
					setLitCells(new Set());
					const next = makeRandomPuzzle();
					setPuzzle(next);
					frameRef.current = setTimeout(() => runAnimation(next), 700);
				}, 2200);
			}
		};

		fill();
		return () => { running = false; };
	};

	useEffect(() => {
		const cleanup = runAnimation(puzzle);
		return () => { cleanup?.(); clearTimeout(frameRef.current); };
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const { rowClues, colClues } = calcClues(puzzle);
	const CELL = "clamp(32px, 4.5vw, 52px)";
	const CLUE_FONT = "clamp(10px, 1.1vw, 13px)";

	return (
		<table style={{ borderCollapse: "collapse", fontFamily: "'DM Mono', monospace" }}>
			<thead>
				<tr>
					<td style={{ width: "clamp(36px, 4vw, 52px)" }} />
					{colClues.map((clue, ci) => (
						<td key={ci} style={{ width: CELL, textAlign: "center", paddingBottom: 6, verticalAlign: "bottom" }}>
							{clue.map((n, i) => (
								<div key={i} style={{ fontSize: CLUE_FONT, fontWeight: 500, color: t.textDim, lineHeight: 1.4 }}>{n}</div>
							))}
						</td>
					))}
				</tr>
			</thead>
			<tbody>
				{puzzle.map((row, ri) => (
					<tr key={ri}>
						<td style={{ textAlign: "right", paddingRight: 8, fontSize: CLUE_FONT, fontWeight: 500, color: t.textDim, minWidth: "clamp(36px, 4vw, 52px)" }}>
							{rowClues[ri].join(" ")}
						</td>
						{row.map((_, ci) => {
							const key = `${ri}-${ci}`;
							const lit = litCells.has(key);
							return (
								<td key={ci} style={{
									width: CELL, height: CELL,
									background: lit ? t.accent : "transparent",
									border: `1px solid ${t.gridBg}`,
									transition: "background 0.12s ease",
								}} />
							);
						})}
					</tr>
				))}
			</tbody>
		</table>
	);
}

// ── Mode card ────────────────────────────────────────────────────────────────
function ModeCard({ badge, title, description, t, onClick }) {
	const [hov, setHov] = useState(false);

	return (
		<div
			onClick={onClick}
			onMouseEnter={() => setHov(true)}
			onMouseLeave={() => setHov(false)}
			style={{
				background: hov ? t.cardHover : t.card,
				border: `1px solid ${hov ? t.accent + "60" : t.border}`,
				borderRadius: 2,
				padding: "clamp(18px, 2.2vh, 28px) clamp(22px, 2.5vw, 32px)",
				cursor: "pointer",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 16,
				transition: "all 0.18s ease",
				transform: hov ? "translateX(4px)" : "translateX(0)",
			}}
		>
			<div style={{ flex: 1 }}>
				<div style={{
					fontFamily: "'DM Mono', monospace",
					fontSize: "clamp(10px, 1vw, 12px)",
					color: t.accent,
					letterSpacing: "0.18em",
					textTransform: "uppercase",
					marginBottom: 6,
				}}>
					{badge}
				</div>
				<div style={{
					fontFamily: "'Outfit', sans-serif",
					fontWeight: 600,
					fontSize: "clamp(17px, 2vw, 22px)",
					color: t.text,
					marginBottom: 4,
				}}>
					{title}
				</div>
				<div style={{
					fontFamily: "'DM Mono', monospace",
					fontSize: "clamp(11px, 1.1vw, 14px)",
					color: t.textDim,
					lineHeight: 1.6,
					letterSpacing: "0.02em",
				}}>
					{description}
				</div>
			</div>
			<div style={{
				fontFamily: "'DM Mono', monospace",
				color: hov ? t.accent : t.textDim,
				fontSize: "clamp(18px, 2vw, 24px)",
				transition: "color 0.18s, transform 0.18s",
				transform: hov ? "translateX(4px)" : "none",
				flexShrink: 0,
			}}>
				→
			</div>
		</div>
	);
}

// ── Theme toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ dark, onToggle, t }) {
	return (
		<button
			onClick={onToggle}
			style={{
				background: "transparent",
				border: `1px solid ${t.border}`,
				borderRadius: 2,
				padding: "6px 14px",
				fontFamily: "'DM Mono', monospace",
				fontSize: "clamp(11px, 1.1vw, 14px)",
				color: t.textDim,
				cursor: "pointer",
				letterSpacing: "0.12em",
				transition: "all 0.18s",
			}}
			onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
			onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textDim; }}
		>
			{dark ? "[ light ]" : "[ dark ]"}
		</button>
	);
}

// ── Home page ────────────────────────────────────────────────────────────────
function Home() {
	const navigate = useNavigate();
	const [dark, setDark] = useTheme();
	const [flash, setFlash] = useState(null);

	const t = dark ? DARK : LIGHT;

	const handleMode = (mode) => {
		setFlash(mode);
		setTimeout(() => {
			navigate(mode === "single" ? "/play" : "/multiplayer");
		}, 320);
	};

	return (
		<div
			style={{
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				position: "relative",
				overflowX: "hidden",
				background: t.bg,
				color: t.text,
				transition: "background 0.35s ease, color 0.35s ease",
				fontFamily: "'Outfit', sans-serif",
			}}
		>
			{/* Grid background */}
			<div style={{
				pointerEvents: "none",
				position: "absolute",
				inset: 0,
				backgroundImage: `linear-gradient(${t.gridBg} 1px, transparent 1px), linear-gradient(90deg, ${t.gridBg} 1px, transparent 1px)`,
				backgroundSize: "32px 32px",
				opacity: dark ? 0.25 : 0.4,
				transition: "opacity 0.35s ease",
			}} />


			{/* Top bar */}
			<div style={{
				position: "absolute",
				top: 0, left: 0, right: 0,
				zIndex: 20,
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				padding: "16px 24px",
			}}>
				<span style={{
					fontFamily: "'DM Mono', monospace",
					fontSize: "clamp(13px, 1.3vw, 16px)",
					color: t.accent,
					letterSpacing: "0.12em",
				}}>
					— nono —
				</span>
				<ThemeToggle dark={dark} onToggle={() => setDark((d) => !d)} t={t} />
			</div>

			{/* Main */}
			<main style={{
				position: "relative",
				zIndex: 10,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				width: "100%",
				maxWidth: 720,
				padding: "clamp(72px, 10vh, 120px) clamp(24px, 4vw, 48px) clamp(48px, 6vh, 80px)",
				gap: "clamp(28px, 3.5vh, 44px)",
			}}>
				{/* Hero text */}
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
					<h1 style={{
						fontFamily: "'Outfit', sans-serif",
						fontSize: "clamp(48px, 8vw, 88px)",
						fontWeight: 700,
						letterSpacing: "-0.03em",
						color: t.text,
						margin: 0,
						textAlign: "center",
						transition: "color 0.35s",
					}}>
						nono.gg
					</h1>
					<p style={{
						fontFamily: "'DM Mono', monospace",
						color: t.textDim,
						letterSpacing: "0.04em",
						fontSize: "clamp(13px, 1.3vw, 17px)",
						margin: 0,
						transition: "color 0.35s",
					}}>
						solve nonograms. alone or with friends.
					</p>
				</div>

				{/* Preview */}
				<div style={{ filter: `drop-shadow(0 0 32px ${t.accent}18)` }}>
					<NonogramPreview t={t} />
				</div>

				{/* Mode cards */}
				<div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
					<p style={{
						fontFamily: "'DM Mono', monospace",
						color: t.textDim,
						letterSpacing: "0.15em",
						fontSize: "clamp(10px, 1vw, 12px)",
						textTransform: "uppercase",
						margin: "0 0 4px 0",
					}}>
						choose mode
					</p>
					<ModeCard
						badge="01 / solo"
						title="Single Player"
						description="challenge yourself."
						t={t}
						onClick={() => handleMode("single")}
					/>
					<ModeCard
						badge="02 / versus"
						title="Multiplayer"
						description="play online with friends. first to solve wins."
						t={t}
						onClick={() => handleMode("multi")}
					/>
				</div>

				{/* Footer links */}
				<footer style={{
					display: "flex",
					alignItems: "center",
					gap: 20,
					fontFamily: "'DM Mono', monospace",
					fontSize: "clamp(11px, 1.1vw, 14px)",
					color: t.textDim,
				}}>
					<span
						onClick={() => navigate("/how-to-play")}
						style={{ cursor: "pointer", transition: "color 0.18s" }}
						onMouseEnter={(e) => (e.currentTarget.style.color = t.accent)}
						onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
					>how to play</span>
					<span style={{ color: t.border }}>·</span>
					<span>settings</span>
				</footer>
			</main>

			{/* Flash toast on mode select */}
			{flash && (
				<div style={{
					position: "fixed",
					bottom: 32,
					left: "50%",
					zIndex: 50,
					padding: "10px 22px",
					fontFamily: "'DM Mono', monospace",
					fontSize: 12,
					letterSpacing: "0.08em",
					background: t.accent,
					color: t.accentFg,
					borderRadius: 2,
					animation: "fadeUp 0.25s ease",
				}}>
					starting {flash === "single" ? "solo puzzle" : "multiplayer room"} →
				</div>
			)}
		</div>
	);
}

export default Home;
