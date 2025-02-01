import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { colyseusClient } from "../ColyseusClient";

function Lobby() {
	const navigate = useNavigate();
	const [roomCode, setRoomCode] = useState("");
	const [createdRoomCode, setCreatedRoomCode] = useState(null);

	// ✅ Create a room and navigate to multiplayer
	const createLobby = async () => {
		try {
			const room = await colyseusClient.create("game_room"); // ✅ Create the room
			setCreatedRoomCode(room.id);
			navigate(`/multiplayer/${room.id}`); // ✅ Redirect to multiplayer game
		} catch (error) {
			console.error("❌ Failed to create room:", error);
			alert("Could not create room.");
		}
	};

	// ✅ Join a room
	const joinLobby = async () => {
		if (roomCode.trim() !== "") {
			try {
				const room = await colyseusClient.joinById(roomCode);
				navigate(`/multiplayer/${roomCode}`); // ✅ Redirect to multiplayer game
			} catch (error) {
				console.error("❌ Failed to join room:", error);
				alert("Room not found! Make sure the host has created it.");
			}
		} else {
			alert("Please enter a valid room code.");
		}
	};

	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<h1 className="text-4xl font-bold mb-6">Multiplayer Lobby</h1>

			{/* ✅ Show room code after creation */}
			{createdRoomCode ? (
				<div className="text-xl font-bold text-blue-600 mb-4">
					Room Code: <span className="bg-gray-200 p-2 rounded">{createdRoomCode}</span>
				</div>
			) : (
				<button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded mb-4" onClick={createLobby}>
					Create Lobby
				</button>
			)}

			{/* ✅ Input field to join a room */}
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

export default Lobby;
