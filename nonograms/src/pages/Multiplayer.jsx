import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { colyseusClient } from "../ColyseusClient";

function Multiplayer() {
	const navigate = useNavigate();
	const [roomCode, setRoomCode] = useState("");
	const [createdRoomCode, setCreatedRoomCode] = useState(null);
	const [playerName, setPlayerName] = useState("");
	const [room, setRoom] = useState(null);

	// Create a room
	const createLobby = async () => {
		try {
			console.log("Creating room with name:", playerName);
			const newRoom = await colyseusClient.create("game_room", { name: playerName });

			console.log("Room created successfully! ID:", newRoom.id);
			setCreatedRoomCode(newRoom.id);
			setRoom(newRoom); // ✅ Store the created room in state
		} catch (error) {
			console.error("Failed to create room:", error);
			alert("Could not create room.");
		}
	};

	// Join a room
	const joinLobby = async () => {
		if (roomCode.trim() !== "") {
			try {
				console.log(`🔄 Joining room: ${roomCode}`);

				// ✅ Ensure `room` is properly checked
				if (room !== null) {
					console.warn("⚠️ Already joined the room, skipping duplicate request.");
					return;
				}

				const newRoom = await colyseusClient.joinById(roomCode, { name: playerName });

				console.log("✅ Successfully joined room:", newRoom);
				setRoom(newRoom); // ✅ Store the joined room in state
				navigate(`/lobby/${roomCode}`);
			} catch (error) {
				console.error("❌ Failed to join room:", error);
				alert("Room not found! Make sure the host has created it.");
			}
		} else {
			alert("⚠️ Please enter a valid room code.");
		}
	};
	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<h1 className="text-4xl font-bold mb-6">Multiplayer</h1>

			{/* Name Input */}
			<input
				type="text"
				className="border-2 border-gray-300 rounded px-2 py-1 mb-4"
				placeholder="Enter your name"
				value={playerName}
				onChange={(e) => setPlayerName(e.target.value)}
			/>

			{createdRoomCode ? (
				<div className="text-xl font-bold text-blue-600 mb-4">
					Room Code: <span className="bg-gray-200 p-2 rounded">{createdRoomCode}</span>
				</div>
			) : (
				<button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded mb-4" onClick={createLobby}>
					Create Lobby
				</button>
			)}

			{/* Input field to join a room */}
			<div className="flex space-x-2">
				<input
					type="text"
					className="border-2 border-gray-300 rounded px-2 py-1"
					placeholder="Enter Room Code"
					value={roomCode}
					onChange={(e) => setRoomCode(e.target.value)}
				/>
				<button className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded" onClick={joinLobby}>
					Join Lobby
				</button>
			</div>
		</div>
	);
}

export default Multiplayer;
