import { useState } from "react";
import Board from "../components/Board";

function SinglePlayer() {
	const [boardSize, setBoardSize] = useState(10);
	const [inputSize, setInputSize] = useState(boardSize);

	return (
		<div
			className="min-h-screen px-6 py-8"
			style={{ background: "linear-gradient(135deg, #fde8f0 0%, #e8f0fd 50%, #e8fdf0 100%)" }}
		>
			<div className="flex flex-col items-center mb-6">
				<h1 className="text-4xl font-extrabold mb-1" style={{ color: "#c084a0" }}>
					🌸 Nonograms
				</h1>
				<p className="text-sm font-medium mb-4" style={{ color: "#c4a8bc" }}>single player</p>
				<div className="flex flex-row items-center gap-2">
					<input
						type="text"
						placeholder="10"
						className="text-xl rounded-full px-4 py-2 w-24 text-center outline-none shadow-sm"
						style={{ border: "2px solid #f7c5dc", color: "#9b5b7a", background: "#fff0f6" }}
						onChange={(e) => setInputSize(Number(e.target.value))}
					/>
					<button
						onClick={() => setBoardSize(inputSize)}
						className="text-xl font-bold rounded-full px-6 py-2 shadow-sm transition-transform hover:scale-105"
						style={{ background: "#f7c5dc", color: "#9b5b7a" }}
					>
						Generate
					</button>
				</div>
			</div>
			<Board size={boardSize} />
		</div>
	);
}

export default SinglePlayer;
