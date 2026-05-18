import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { colyseusClient } from "../ColyseusClient";
import { setRoom } from "../roomStore";

const DEFAULT_SETTINGS = { maxPlayers: 4, boardVisibility: true, rounds: 1, boardSize: 10 };

function SettingsModal({ settings, onChange, onConfirm, onCancel }) {
	return (
		<div className="fixed inset-0 flex items-center justify-center z-50"
			style={{ background: "rgba(200,160,180,0.25)", backdropFilter: "blur(4px)" }}>
			<div className="rounded-3xl p-8 w-80 shadow-xl flex flex-col gap-5"
				style={{ background: "#fff0f6", border: "2px solid #f7c5dc" }}>
				<h2 className="text-2xl font-extrabold text-center" style={{ color: "#c084a0" }}>
					🛠 Lobby Settings
				</h2>

				{/* Max players */}
				<label className="flex flex-col gap-1">
					<span className="text-sm font-semibold" style={{ color: "#b07090" }}>
						Max Players (1–10)
					</span>
					<input
						type="number" min={1} max={10}
						value={settings.maxPlayers}
						onChange={(e) => onChange("maxPlayers", Math.min(10, Math.max(1, Number(e.target.value))))}
						className="rounded-full px-4 py-2 text-center outline-none text-lg font-bold"
						style={{ border: "2px solid #f7c5dc", color: "#9b5b7a", background: "white" }}
					/>
				</label>

				{/* Board size */}
				<label className="flex flex-col gap-1">
					<span className="text-sm font-semibold" style={{ color: "#b07090" }}>
						Board Size (5–20)
					</span>
					<input
						type="number" min={5} max={20}
						value={settings.boardSize}
						onChange={(e) => onChange("boardSize", Math.min(20, Math.max(5, Number(e.target.value))))}
						className="rounded-full px-4 py-2 text-center outline-none text-lg font-bold"
						style={{ border: "2px solid #f7c5dc", color: "#9b5b7a", background: "white" }}
					/>
				</label>

				{/* Rounds */}
				<label className="flex flex-col gap-1">
					<span className="text-sm font-semibold" style={{ color: "#b07090" }}>
						Rounds (1–10)
					</span>
					<input
						type="number" min={1} max={10}
						value={settings.rounds}
						onChange={(e) => onChange("rounds", Math.min(10, Math.max(1, Number(e.target.value))))}
						className="rounded-full px-4 py-2 text-center outline-none text-lg font-bold"
						style={{ border: "2px solid #f7c5dc", color: "#9b5b7a", background: "white" }}
					/>
				</label>

				{/* Board visibility */}
				<label className="flex items-center justify-between gap-3 cursor-pointer">
					<span className="text-sm font-semibold" style={{ color: "#b07090" }}>
						Board Visibility
						<span className="block text-xs font-normal" style={{ color: "#c4a8bc" }}>
							Show opponents' boards during game
						</span>
					</span>
					<button
						onClick={() => onChange("boardVisibility", !settings.boardVisibility)}
						className="w-12 h-6 rounded-full transition-colors relative flex-shrink-0"
						style={{ background: settings.boardVisibility ? "#f7a8c0" : "#e0d0e8" }}
					>
						<span
							className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
							style={{ left: settings.boardVisibility ? "calc(100% - 1.375rem)" : "0.125rem" }}
						/>
					</button>
				</label>

				<div className="flex gap-3 mt-2">
					<button onClick={onCancel}
						className="flex-1 rounded-full py-2 font-semibold transition-transform hover:scale-105"
						style={{ background: "#e8d5f0", color: "#8b5b9b" }}>
						Cancel
					</button>
					<button onClick={onConfirm}
						className="flex-1 rounded-full py-2 font-semibold transition-transform hover:scale-105"
						style={{ background: "#c5f7dc", color: "#3a9b6a" }}>
						Create!
					</button>
				</div>
			</div>
		</div>
	);
}

function Multiplayer() {
	const navigate = useNavigate();
	const [roomCode, setRoomCode] = useState("");
	const [playerName, setPlayerName] = useState("");
	const [loading, setLoading] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });

	const updateSetting = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

	const openSettings = () => {
		if (!playerName.trim()) return alert("Please enter your name first.");
		setShowSettings(true);
	};

	const createLobby = async () => {
		setShowSettings(false);
		setLoading(true);
		try {
			const room = await colyseusClient.create("game_room", { name: playerName, ...settings });
			setRoom(room, playerName, true);
			navigate(`/multiplayer/${room.id}`);
		} catch (error) {
			console.error("Failed to create room:", error);
			alert("Could not create room.");
		} finally {
			setLoading(false);
		}
	};

	const joinLobby = async () => {
		if (!playerName.trim()) return alert("Please enter your name first.");
		if (!roomCode.trim()) return alert("Please enter a room code.");
		setLoading(true);
		try {
			const room = await colyseusClient.joinById(roomCode.trim(), { name: playerName });
			setRoom(room, playerName, false);
			navigate(`/multiplayer/${room.id}`);
		} catch (error) {
			console.error("Failed to join room:", error);
			alert("Room not found. Make sure the host has created it.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center h-screen"
			style={{ background: "linear-gradient(135deg, #fde8f0 0%, #e8f0fd 50%, #e8fdf0 100%)" }}>

			{showSettings && (
				<SettingsModal
					settings={settings}
					onChange={updateSetting}
					onConfirm={createLobby}
					onCancel={() => setShowSettings(false)}
				/>
			)}

			<div className="mb-2 text-5xl">🎮</div>
			<h1 className="text-5xl font-extrabold mb-2 tracking-wide" style={{ color: "#c084a0" }}>
				Multiplayer
			</h1>
			<p className="mb-8 text-sm font-medium" style={{ color: "#c4a8bc" }}>play with friends ✨</p>

			<input
				type="text"
				className="text-lg rounded-full px-5 py-2 mb-6 text-center outline-none shadow-sm w-56"
				style={{ border: "2px solid #f7c5dc", color: "#9b5b7a", background: "#fff0f6" }}
				placeholder="Enter your name"
				value={playerName}
				onChange={(e) => setPlayerName(e.target.value)}
				disabled={loading}
			/>

			<button
				className="font-bold rounded-full px-8 py-2 mb-6 shadow-sm transition-transform hover:scale-105 disabled:opacity-50"
				style={{ background: "#c5f7dc", color: "#3a9b6a" }}
				onClick={openSettings}
				disabled={loading}
			>
				Create Lobby
			</button>

			<div className="flex gap-2">
				<input
					type="text"
					className="text-lg rounded-full px-5 py-2 text-center outline-none shadow-sm w-44"
					style={{ border: "2px solid #c5dff7", color: "#3a6a9b", background: "#f0f6ff" }}
					placeholder="Room Code"
					value={roomCode}
					onChange={(e) => setRoomCode(e.target.value)}
					disabled={loading}
				/>
				<button
					className="font-bold rounded-full px-6 py-2 shadow-sm transition-transform hover:scale-105 disabled:opacity-50"
					style={{ background: "#c5dff7", color: "#3a6a9b" }}
					onClick={joinLobby}
					disabled={loading}
				>
					Join
				</button>
			</div>
		</div>
	);
}

export default Multiplayer;
