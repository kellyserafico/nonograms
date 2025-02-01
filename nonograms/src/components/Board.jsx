import PropTypes from "prop-types";
import { useState, useEffect } from "react";

function Board({ size }) {
	const [solution, setSolution] = useState([]);
	const [cellColors, setCellColors] = useState([]);
	const [rowClues, setRowClues] = useState([]);
	const [colClues, setColClues] = useState([]);
	const [win, setWin] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [dragColor, setDragColor] = useState(null); // Current drag color
	const [timer, setTimer] = useState(0); // Timer state
	const [isRunning, setIsRunning] = useState(true); // Timer running state

	useEffect(() => {
		// Generate random solution
		const newSolution = Array.from({ length: size }, () => Array.from({ length: size }, () => Math.random() < 0.5));
		setSolution(newSolution);

		// Generate initial cell colors with unique rows
		setCellColors(Array.from({ length: size }, () => Array(size).fill("white")));

		// Calculate row clues
		const newRowClues = newSolution.map((row) => {
			let clues = [];
			let count = 0;
			row.forEach((cell) => {
				if (cell) {
					count++;
				} else if (count > 0) {
					clues.push(count);
					count = 0;
				}
			});
			if (count > 0) clues.push(count);
			return clues.length > 0 ? clues : [0];
		});
		setRowClues(newRowClues);

		// Calculate column clues
		const newColClues = Array.from({ length: size }, (_, colIndex) => {
			let clues = [];
			let count = 0;
			for (let rowIndex = 0; rowIndex < size; rowIndex++) {
				if (newSolution[rowIndex][colIndex]) {
					count++;
				} else if (count > 0) {
					clues.push(count);
					count = 0;
				}
			}
			if (count > 0) clues.push(count);
			return clues.length > 0 ? clues : [0];
		});
		setColClues(newColClues);
	}, [size]);

	useEffect(() => {
		let interval;
		if (isRunning) {
			interval = setInterval(() => {
				setTimer((prevTimer) => prevTimer + 1);
			}, 1000);
		}
		return () => clearInterval(interval);
	}, [isRunning]);

	const renderColumnClues = () => (
		<tr>
			<td></td> {/* Empty cell for alignment */}
			{colClues.map((clue, index) => (
				<td key={index} className="text-center text-3xl">
					{clue.map((num, clueIndex) => (
						<div key={clueIndex}>{num}</div>
					))}
				</td>
			))}
		</tr>
	);

	const handleMouseDown = (i, j, event) => {
		event.preventDefault(); // Prevent default context menu on right-click
		setIsDragging(true);

		if (event.button === 0) {
			// Left-click: Toggle between "white" and "black"
			setDragColor(cellColors[i][j] === "white" ? "black" : "white");
			updateCellColor(i, j, cellColors[i][j] === "white" ? "black" : "white");
		} else if (event.button === 2) {
			// Right-click: Toggle between "white" and "red"
			setDragColor(cellColors[i][j] === "red" ? "white" : "red");
			updateCellColor(i, j, cellColors[i][j] === "red" ? "white" : "red");
		}
	};

	const handleMouseMove = (i, j) => {
		if (isDragging && dragColor !== null) {
			updateCellColor(i, j, dragColor); // Apply drag color
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false); // Stop dragging
		checkWin(cellColors); // Check win condition
	};

	const updateCellColor = (i, j, color) => {
		setCellColors((prevColors) =>
			prevColors.map((row, rowIndex) =>
				row.map((cellColor, colIndex) => {
					if (rowIndex === i && colIndex === j) {
						return color;
					}
					return cellColor;
				})
			)
		);
	};

	const checkWin = (currentColors) => {
		const isWin = solution.every((row, i) =>
			row.every((cell, j) => (cell ? currentColors[i][j] === "black" : currentColors[i][j] !== "black"))
		);
		setWin(isWin);
		if (isWin) {
			setIsRunning(false); // Stop the timer when the user wins
		}
	};

	const createTable = () => {
		if (cellColors.length === 0) return null; // Ensure cellColors is initialized

		let table = [];
		for (let i = 0; i < size; i++) {
			let row = [
				<td key={`clue-${i}`} className="text-right pr-2 text-3xl">
					{rowClues[i]?.join(" ")}
				</td>, // Row clue
			];
			for (let j = 0; j < size; j++) {
				row.push(
					<td
						key={`${i}-${j}`}
						className="border border-black w-20 h-20"
						style={{ backgroundColor: cellColors[i]?.[j] || "white" }}
						onMouseDown={(e) => handleMouseDown(i, j, e)}
						onMouseMove={() => handleMouseMove(i, j)}
						onMouseUp={handleMouseUp}
						onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right-click
					></td>
				);
			}
			table.push(<tr key={i}>{row}</tr>);
		}
		return table;
	};

	return (
		<div>
			<h1 className="text-center">{win ? "You Win!" : "Nonograms Game"}</h1>
			<div className="text-center text-2xl">
				Time: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")} minutes
			</div>
			<table
				className="m-auto border-collapse"
				onMouseLeave={handleMouseUp} // Ensure drag ends when mouse leaves table
			>
				<thead>{renderColumnClues()}</thead>
				<tbody>{createTable()}</tbody>
			</table>
		</div>
	);
}

Board.propTypes = {
	size: PropTypes.number.isRequired,
};

export default Board;
