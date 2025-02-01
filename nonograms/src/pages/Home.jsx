import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
	const navigate = useNavigate();
	const [roomCode, setRoomCode] = useState("");

	const createLobby = () => {
		navigate("/lobby"); // Redirect to lobby creation page
	};

	const joinLobby = () => {
		if (roomCode.trim() !== "") {
			navigate(`/lobby/${roomCode}`); // Redirect to the specific room
		} else {
			alert("Please enter a valid room code.");
		}
	};

	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<h1 className="text-4xl font-bold mb-6">Nonograms</h1>

			{/* Single Player Mode */}
			<button
				className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded mb-4"
				onClick={() => navigate("/play")}
			>
				Single Player
			</button>

			{/* Multiplayer Mode */}
			<div className="flex flex-col items-center">
				<button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded mb-4" onClick={createLobby}>
					Create Multiplayer Lobby
				</button>

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
		</div>
	);
}

export default Home;
