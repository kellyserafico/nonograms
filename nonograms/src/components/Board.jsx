import PropTypes from "prop-types";
import { useState, useEffect } from "react";

function Board({ size }) {
	const [solution, setSolution] = useState([]);
	const [cellColors, setCellColors] = useState([]);
	const [rowClues, setRowClues] = useState([]);
	const [colClues, setColClues] = useState([]);
	const [win, setWin] = useState(false);

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

	const renderColumnClues = () => (
		<tr>
			<td></td> {/* Empty cell for alignment */}
			{colClues.map((clue, index) => (
				<td key={index} className="text-center">
					{clue.map((num, clueIndex) => (
						<div key={clueIndex}>{num}</div>
					))}
				</td>
			))}
		</tr>
	);

	const handleCellClick = (i, j, event) => {
		event.preventDefault();
		const newColors = cellColors.map((row, rowIndex) =>
			row.map((color, colIndex) => {
				if (rowIndex === i && colIndex === j) {
					if (event.type === "click") {
						if (color === "white") {
							return "black";
						} else if (color === "red") {
							return "white";
						}
					} else if (event.type === "contextmenu") {
						if (color === "black" || color === "red") {
							return "white";
						} else {
							return "red";
						}
					}
				}
				return color;
			})
		);
		setCellColors(newColors);
		checkWin(newColors);
	};

	const checkWin = (currentColors) => {
		const isWin = solution.every((row, i) =>
			row.every((cell, j) => (cell ? currentColors[i][j] === "black" : currentColors[i][j] !== "black"))
		);
		setWin(isWin);
	};

	const createTable = () => {
		if (cellColors.length === 0) return null; // Ensure cellColors is initialized

		let table = [];
		for (let i = 0; i < size; i++) {
			let row = [
				<td key={`clue-${i}`} className="text-right pr-2">
					{rowClues[i]?.join(" ")}
				</td>, // Row clue
			];
			for (let j = 0; j < size; j++) {
				row.push(
					<td
						key={`${i}-${j}`}
						className="border border-black w-8 h-8"
						style={{ backgroundColor: cellColors[i]?.[j] || "white" }}
						onClick={(e) => handleCellClick(i, j, e)}
						onContextMenu={(e) => handleCellClick(i, j, e)}
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
			<table className="border-collapse">
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
