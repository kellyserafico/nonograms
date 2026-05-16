import { useState } from "react";
import Board from "../components/Board";
function SinglePlayer() {
	const [boardSize, setBoardSize] = useState(10);

	const [inputSize, setInputSize] = useState(boardSize);

	return (
		<div>
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
export default SinglePlayer;
