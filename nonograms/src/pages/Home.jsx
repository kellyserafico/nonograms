import React from "react";
import { useNavigate } from "react-router-dom";

function Home() {
	const navigate = useNavigate();

	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<h1 className="text-4xl font-bold mb-6">Nonograms</h1>

			{/* Single Player */}
			<button
				className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded mb-4"
				onClick={() => navigate("/play")}
			>
				Single Player
			</button>

			{/* Multiplayer */}
			<button
				className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded"
				onClick={() => navigate("/multiplayer")}
			>
				Multiplayer
			</button>
		</div>
	);
}

export default Home;
