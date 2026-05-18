import React from "react";
import { useNavigate } from "react-router-dom";

function Home() {
	const navigate = useNavigate();

	return (
		<div
			className="flex flex-col items-center justify-center h-screen"
			style={{ background: "linear-gradient(135deg, #fde8f0 0%, #e8f0fd 50%, #e8fdf0 100%)" }}
		>
			<div className="mb-2 text-5xl">🌸</div>
			<h1
				className="text-5xl font-extrabold mb-2 tracking-wide"
				style={{ color: "#c084a0" }}
			>
				Nonograms
			</h1>
			<p className="mb-10 text-sm font-medium" style={{ color: "#c4a8bc" }}>
				a cute little puzzle game ✨
			</p>

			<button
				className="font-bold py-3 px-10 rounded-full mb-4 shadow-sm transition-transform hover:scale-105"
				style={{ background: "#f7c5dc", color: "#9b5b7a" }}
				onClick={() => navigate("/play")}
			>
				Single Player
			</button>

			<button
				className="font-bold py-3 px-10 rounded-full shadow-sm transition-transform hover:scale-105"
				style={{ background: "#c5dff7", color: "#3a6a9b" }}
				onClick={() => navigate("/multiplayer")}
			>
				Multiplayer
			</button>
		</div>
	);
}

export default Home;
