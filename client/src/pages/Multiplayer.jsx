import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DARK, LIGHT } from "../theme";
import { colyseusClient } from "../ColyseusClient";
import { setRoom } from "../roomStore";

// ── Shared pieces ─────────────────────────────────────────────────────────────

function GridBg({ t, dark }) {
	return (
		<div className="pointer-events-none absolute inset-0" style={{
			backgroundImage: `linear-gradient(${t.gridBg} 1px, transparent 1px), linear-gradient(90deg, ${t.gridBg} 1px, transparent 1px)`,
			backgroundSize: "32px 32px",
			opacity: dark ? 0.2 : 0.35,
		}} />
	);
}

function MiniGrid({ t }) {
	const pattern = [
		[1,0,1,0,1],
		[0,1,0,1,0],
		[1,0,1,0,1],
		[0,1,0,1,0],
		[1,0,1,0,1],
	];
	return (
		<div style={{ display: "grid", gridTemplateColumns: "repeat(5, 10px)", gap: 2, opacity: 0.35 }}>
			{pattern.flat().map((on, i) => (
				<div key={i} style={{
					width: 10, height: 10,
					background: on ? t.accent : t.border,
					borderRadius: 1, transition: "background 0.35s",
				}} />
			))}
		</div>
	);
}

function InputField({ label, value, onChange, placeholder, maxLength, t, autoFocus }) {
	const [focused, setFocused] = useState(false);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
			<label style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: t.textDim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
				{label}
			</label>
			<input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				maxLength={maxLength}
				autoFocus={autoFocus}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				style={{
					fontFamily: "DM Mono, monospace", fontSize: "1.05rem",
					padding: "13px 18px", borderRadius: 2,
					border: `1px solid ${focused ? t.accent : t.border}`,
					background: t.card, color: t.text,
					outline: "none", width: "100%",
					transition: "border-color 0.2s", letterSpacing: "0.04em",
				}}
			/>
		</div>
	);
}

function PrimaryButton({ children, onClick, disabled, t }) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			style={{
				fontFamily: "DM Mono, monospace", fontSize: "0.9rem",
				padding: "13px 28px", borderRadius: 2,
				border: `1px solid ${disabled ? t.border : t.accent}`,
				background: disabled ? "transparent" : t.accent,
				color: disabled ? t.textDim : t.accentFg,
				cursor: disabled ? "not-allowed" : "pointer",
				letterSpacing: "0.08em", transition: "all 0.15s",
				opacity: disabled ? 0.5 : 1, width: "100%",
			}}
		>
			{children}
		</button>
	);
}

// ── Create lobby ──────────────────────────────────────────────────────────────

function CreateLobby({ t, onBack, navigate }) {
	const [name, setName] = useState("");
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState("");
	const roomCode = useRef(
		Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 23)]).join("")
	).current;

	const canCreate = name.trim().length >= 2 && !creating;

	const handleCreate = async () => {
		setCreating(true);
		setError("");
		try {
			const room = await colyseusClient.create("game_room", {
				name: name.trim(),
				roomCode,
				maxPlayers: 4,
			});
			setRoom(room, name.trim(), true);
				navigate(`/multiplayer/${roomCode}`);
		} catch {
			setCreating(false);
			setError("could not connect to server. is it running?");
		}
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%", maxWidth: 480, animation: "fadeUp 0.25s ease" }}>
			<div>
				<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: t.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
					01 / create
				</span>
				<h2 style={{ fontSize: "2rem", fontWeight: 700, color: t.text, margin: "10px 0 6px", letterSpacing: "-0.02em" }}>
					Create a lobby
				</h2>
				<p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.85rem", color: t.textDim, lineHeight: 1.6 }}>
					a room code will be generated for your friends to join.
				</p>
			</div>

			<InputField label="your name" value={name} onChange={setName} placeholder="e.g. pixel_solver" maxLength={20} t={t} autoFocus />

			{error && (
				<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "#ff8080", letterSpacing: "0.04em" }}>
					{error}
				</span>
			)}

			<PrimaryButton onClick={handleCreate} disabled={!canCreate} t={t}>
				{creating ? "connecting..." : "create lobby →"}
			</PrimaryButton>

			<button
				onClick={onBack}
				style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: t.textDim, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em", padding: 0, textAlign: "center" }}
				onMouseEnter={(e) => (e.currentTarget.style.color = t.text)}
				onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
			>
				← go back
			</button>
		</div>
	);
}

// ── Join room ─────────────────────────────────────────────────────────────────

const CODE_LENGTH = 4;

function JoinRoom({ t, dark, onBack, navigate, initialCode = "" }) {
	const [name, setName] = useState("");
	const [code, setCode] = useState(initialCode);
	const [error, setError] = useState("");
	const [joining, setJoining] = useState(false);
	const inputRefs = useRef([]);

	const handleCodeKey = (i, e) => {
		if (e.key === "Backspace") {
			e.preventDefault();
			if (code[i]) {
				const arr = code.padEnd(CODE_LENGTH, " ").split("");
				arr[i] = " ";
				setCode(arr.join("").trimEnd());
				setError("");
			} else if (i > 0) {
				inputRefs.current[i - 1]?.focus();
				const arr = code.padEnd(CODE_LENGTH, " ").split("");
				arr[i - 1] = " ";
				setCode(arr.join("").trimEnd());
				setError("");
			}
		}
		if (e.key === "ArrowLeft" && i > 0) inputRefs.current[i - 1]?.focus();
		if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) inputRefs.current[i + 1]?.focus();
	};

	const handleCodeInput = (i, val) => {
		const char = val.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(-1);
		if (!char) return;
		const arr = code.padEnd(CODE_LENGTH, " ").split("");
		arr[i] = char;
		const next = arr.join("").trimEnd();
		setCode(next);
		setError("");
		if (i < CODE_LENGTH - 1) inputRefs.current[i + 1]?.focus();
	};

	const handleCodePaste = (e) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData("text").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, CODE_LENGTH);
		setCode(pasted);
		const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
		inputRefs.current[focusIdx]?.focus();
	};

	const canJoin = name.trim().length >= 2 && code.length === CODE_LENGTH;

	const handleJoin = async () => {
		setJoining(true);
		setError("");
		try {
			const room = await colyseusClient.join("game_room", {
				name: name.trim(),
				roomCode: code,
			});
			setRoom(room, name.trim(), false);
			navigate(`/multiplayer/${code}`);
		} catch {
			setJoining(false);
			setError(`room "${code}" not found. check the code and try again.`);
		}
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%", maxWidth: 480, animation: "fadeUp 0.25s ease" }}>
			<div>
				<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: t.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
					02 / join
				</span>
				<h2 style={{ fontSize: "2rem", fontWeight: 700, color: t.text, margin: "10px 0 6px", letterSpacing: "-0.02em" }}>
					Join a room
				</h2>
				<p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.85rem", color: t.textDim, lineHeight: 1.6 }}>
					enter the 4-letter code shared by the host.
				</p>
			</div>

			<InputField label="your name" value={name} onChange={(v) => { setName(v); setError(""); }} placeholder="e.g. grid_master" maxLength={20} t={t} autoFocus />

			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<label style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: t.textDim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
					room code
				</label>
				<div style={{ display: "flex", gap: 10 }} onPaste={handleCodePaste}>
					{Array.from({ length: CODE_LENGTH }, (_, i) => (
						<input
							key={i}
							ref={(el) => { inputRefs.current[i] = el; }}
							value={code[i] ?? ""}
							onChange={(e) => handleCodeInput(i, e.target.value)}
							onKeyDown={(e) => handleCodeKey(i, e)}
							maxLength={1}
							style={{
								width: 70, height: 74, textAlign: "center",
								fontFamily: "DM Mono, monospace", fontSize: "1.8rem", fontWeight: 600,
								textTransform: "uppercase", letterSpacing: "0.04em",
								borderRadius: 2, border: `1px solid ${error ? "#ff6e6e80" : code[i] ? t.accent : t.border}`,
								background: t.card, color: code[i] ? t.accent : t.text,
								outline: "none", transition: "border-color 0.15s, color 0.15s",
								caretColor: "transparent",
							}}
							onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = t.accent; }}
							onBlur={(e) => { e.currentTarget.style.borderColor = code[i] ? t.accent : t.border; }}
						/>
					))}
				</div>
				{error && (
					<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: dark ? "#ff8080" : "#cc3322", letterSpacing: "0.04em", animation: "fadeUp 0.2s ease" }}>
						{error}
					</span>
				)}
			</div>

			<PrimaryButton onClick={handleJoin} disabled={!canJoin || joining} t={t}>
				{joining ? "connecting..." : "join room →"}
			</PrimaryButton>

			<button
				onClick={onBack}
				style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: t.textDim, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em", padding: 0, textAlign: "center" }}
				onMouseEnter={(e) => (e.currentTarget.style.color = t.text)}
				onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
			>
				← go back
			</button>
		</div>
	);
}

// ── Choose view ───────────────────────────────────────────────────────────────

function ChooseView({ t, onChoose }) {
	const [hovered, setHovered] = useState(null);

	const options = [
		{ key: "create", badge: "01 / host", title: "Create lobby", description: "generate a room code and invite friends to join." },
		{ key: "join",   badge: "02 / guest", title: "Join a room",  description: "enter a 4-letter code to join an existing game." },
	];

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%", maxWidth: 560, animation: "fadeUp 0.25s ease" }}>
			<div>
				<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: t.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
					02 / multiplayer
				</span>
				<h2 style={{ fontSize: "2.2rem", fontWeight: 700, color: t.text, margin: "10px 0 6px", letterSpacing: "-0.02em" }}>
					Play with friends
				</h2>
				<p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.9rem", color: t.textDim, lineHeight: 1.6 }}>
					create a lobby or join one with a room code.
				</p>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				{options.map((opt) => (
					<button
						key={opt.key}
						onClick={() => onChoose(opt.key)}
						onMouseEnter={() => setHovered(opt.key)}
						onMouseLeave={() => setHovered(null)}
						style={{
							textAlign: "left", cursor: "pointer", padding: "28px 32px",
							borderRadius: 2, outline: "none",
							border: `1px solid ${hovered === opt.key ? t.accent + "60" : t.border}`,
							background: hovered === opt.key ? t.cardHover : t.card,
							transition: "all 0.2s", position: "relative", overflow: "hidden",
						}}
					>
						<div style={{
							position: "absolute", top: 0, left: 0, right: 0, height: 1,
							background: hovered === opt.key ? `linear-gradient(90deg, transparent, ${t.accent}, transparent)` : "transparent",
							transition: "background 0.4s",
						}} />
						<span style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: hovered === opt.key ? t.accent : t.textDim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10, transition: "color 0.2s" }}>
							{opt.badge}
						</span>
						<span style={{ display: "block", fontSize: "1.35rem", fontWeight: 600, color: hovered === opt.key ? t.text : t.textMuted, marginBottom: 8, transition: "color 0.2s" }}>
							{opt.title}
						</span>
						<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.85rem", color: t.textDim, lineHeight: 1.5 }}>
							{opt.description}
						</span>
						<div style={{ position: "absolute", bottom: 28, right: 30, color: hovered === opt.key ? t.accent : t.border, transform: hovered === opt.key ? "translateX(4px)" : "translateX(0)", transition: "all 0.2s" }}>
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
								<path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}

// ── Root page ─────────────────────────────────────────────────────────────────

export default function Multiplayer() {
	const navigate = useNavigate();
	const location = useLocation();
	const [dark, setDark] = useState(true);
	const [view, setView] = useState(location.state?.view || "choose");
	const initialCode = location.state?.code || "";

	const t = dark ? DARK : LIGHT;

	const handleBack = () => {
		if (view === "choose") navigate("/");
		else setView("choose");
	};

	return (
		<div
			className="min-h-screen flex flex-col relative overflow-hidden"
			style={{ background: t.bg, color: t.text, transition: "background 0.35s, color 0.35s", fontFamily: "Outfit, sans-serif" }}
		>
			<GridBg t={t} dark={dark} />

			<header className="relative z-10 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: t.border }}>
				<button
					onClick={handleBack}
					style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: t.textDim, letterSpacing: "0.06em", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.2s" }}
					onMouseEnter={(e) => (e.currentTarget.style.color = t.accent)}
					onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					back
				</button>

				<span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: t.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
					nonogram / multi
				</span>

				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					<MiniGrid t={t} />
					<button
						onClick={() => setDark((d) => !d)}
						style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 2, padding: "5px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: t.textDim, cursor: "pointer", letterSpacing: "0.12em" }}
						onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
						onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textDim; }}
					>
						{dark ? "[ light ]" : "[ dark ]"}
					</button>
				</div>
			</header>

			<div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
				{view === "choose" && <ChooseView t={t} onChoose={setView} />}
				{view === "create" && <CreateLobby t={t} onBack={() => setView("choose")} navigate={navigate} />}
				{view === "join"   && <JoinRoom   t={t} dark={dark} onBack={() => setView("choose")} navigate={navigate} initialCode={initialCode} />}
			</div>

			<style>{`
				@keyframes fadeUp {
					from { opacity: 0; transform: translateY(10px); }
					to   { opacity: 1; transform: translateY(0); }
				}
			`}</style>
		</div>
	);
}
