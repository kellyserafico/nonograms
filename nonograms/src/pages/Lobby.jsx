import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { colyseusClient } from "../ColyseusClient";

function Lobby() {
	const navigate = useNavigate();
	const [roomCode, setRoomCode] = useState("");

	const createLobby = async () => {
		try {
			const room = await colyseusClient.create("game_room");
			navigate(`/lobby/${room.id}`); // ✅ Redirect to multiplayer game
		} catch (error) {
			console.error("Failed to create room:", error);
			alert("Could not create room.");
		}
	};

	const joinLobby = () => {
		if (roomCode.trim() !== "") {
			navigate(`/lobby/${roomCode}`); // ✅ Redirect to specific room
		} else {
			alert("Please enter a valid room code.");
		}
	};

	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<h1 className="text-4xl font-bold mb-6">Multiplayer Lobby</h1>

			{/* Create a lobby */}
			<button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded mb-4" onClick={createLobby}>
				Create Lobby
			</button>

			{/* Join a lobby */}
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
