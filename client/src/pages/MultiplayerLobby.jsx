import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { colyseusClient } from "../ColyseusClient";
import Board from "../components/Board";

function MultiplayerLobby() {
	const { roomCode } = useParams();
	const navigate = useNavigate();
	const [room, setRoom] = useState(null);
	const [players, setPlayers] = useState([]); // ✅ Tracks all players in the room

	useEffect(() => {
		let hasJoined = false; // ✅ Prevents duplicate joins

		const joinGame = async () => {
			try {
				if (hasJoined) return; // ✅ Stop multiple join attempts
				hasJoined = true;

				console.log(`🔄 Attempting to join room: ${roomCode}`);
				const room = await colyseusClient.joinById(roomCode, { name: playerName });
				setRoom(room);

				room.onMessage("update_players", (updatedPlayers) => {
					console.log("👥 Players updated:", updatedPlayers);
					setPlayers(updatedPlayers.filter((name) => name && name.trim()));
				});

				console.log("✅ Successfully joined room:", roomCode);
			} catch (error) {
				console.error("❌ Failed to join game:", error);
				alert("Room not found or full.");
				navigate("/");
			}
		};

		joinGame();
	}, [roomCode]);

	return (
		<div className="flex flex-col items-center">
			<h1 className="text-2xl font-bold mb-4">Room Code: {roomCode}</h1>

			{/* ✅ Display player list on screen */}
			<div className="bg-gray-200 p-4 rounded shadow-md w-1/3 text-center mb-4">
				<h2 className="text-xl font-semibold">Players</h2>
				<ul className="text-lg">
					{players.length === 0 ? (
						<li className="text-gray-500">Waiting for players...</li>
					) : (
						players.map((name, index) => (
							<li key={index} className="text-black font-medium">
								{name}
							</li>
						))
					)}
				</ul>
			</div>

			{/* ✅ Display boards for each player */}
			<div className="flex justify-center gap-10 mt-10">
				{players.map((playerName, index) => (
					<div key={index} className="text-center">
						<h2 className="text-xl font-bold">{playerName}</h2>
						<Board size={10} />
					</div>
				))}
			</div>
		</div>
	);
}

export default MultiplayerLobby;
