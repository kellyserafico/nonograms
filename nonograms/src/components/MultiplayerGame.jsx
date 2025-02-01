import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { colyseusClient } from "../ColyseusClient";
import Board from "./Board";

function MultiplayerGame() {
	const { roomCode } = useParams(); // Get room code from URL
	const navigate = useNavigate();
	const [room, setRoom] = useState(null);
	const [players, setPlayers] = useState({});
	const [gameStarted, setGameStarted] = useState(false);

	useEffect(() => {
		const joinGame = async () => {
			try {
				const room = await colyseusClient.joinById(roomCode);
				setRoom(room);

				// Listen for game start
				room.onMessage("start_game", () => {
					setGameStarted(true);
				});

				// Listen for board updates
				room.onMessage("update_board", (updatedPlayers) => {
					setPlayers(updatedPlayers);
				});
			} catch (error) {
				console.error("Failed to join game:", error);
				alert("Room not found!");
				navigate("/");
			}
		};

		joinGame();
	}, [roomCode, navigate]);

	const updateBoard = (board) => {
		if (room) {
			room.send("update_board", { board });
		}
	};

	if (!gameStarted) {
		return <h1 className="text-center">Waiting for another player...</h1>;
	}

	const playerIds = Object.keys(players);

	return (
		<div className="flex justify-center gap-10 mt-10">
			{playerIds.map((playerId) => (
				<div key={playerId} className="text-center">
					<h2 className="text-xl font-bold">{playerId === room.sessionId ? "You" : "Opponent"}</h2>
					<Board size={10} onBoardUpdate={updateBoard} />
				</div>
			))}
		</div>
	);
}

export default MultiplayerGame;
