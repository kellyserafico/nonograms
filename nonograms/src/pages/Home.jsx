import React from "react";
import { useState } from "react";
import Board from "../components/Board";
function App() {
	const [boardSize, setBoardSize] = useState(10);

	const generateCanvas = () => {
		console.log(boardSize);
	};

	const [inputSize, setInputSize] = useState(boardSize);

	return (
		<div>
			<h1>Nonograms</h1>
			<p className="text-3xl">Enter nonogram size:</p>
			<div className="flex flex-row">
				<input
					type="text"
					placeholder="10"
					className="text-3xl border-2"
					onChange={(e) => setInputSize(Number(e.target.value))}
				/>
				<button onClick={() => setBoardSize(inputSize)} className="text-3xl border-2">
					Generate
				</button>
			</div>
			<Board size={boardSize} />
		</div>
	);
}

export default App;
