import React from "react";
import { useNavigate } from "react-router-dom";

function Multiplayer() {
	const navigate = useNavigate();

	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<h1 className="text-4xl font-bold mb-6">Multiplayer</h1>
			<button
				className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded"
				onClick={() => navigate("/lobby")}
			>
				Go to Lobby
			</button>
		</div>
	);
}

export default Multiplayer;
