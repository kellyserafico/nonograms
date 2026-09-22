import PropTypes from "prop-types";
import { useState, useEffect } from "react";

function calcClues(solution, size) {
	const rowClues = solution.map((row) => {
		let clues = [], count = 0;
		row.forEach((cell) => { if (cell) count++; else if (count > 0) { clues.push(count); count = 0; } });
		if (count > 0) clues.push(count);
		return clues.length > 0 ? clues : [0];
	});
	const colClues = Array.from({ length: size }, (_, ci) => {
		let clues = [], count = 0;
		for (let ri = 0; ri < size; ri++) {
			if (solution[ri][ci]) count++;
			else if (count > 0) { clues.push(count); count = 0; }
		}
		if (count > 0) clues.push(count);
		return clues.length > 0 ? clues : [0];
	});
	return { rowClues, colClues };
}

function Board({ size, onWin, blurred = false, readOnly = false, initialSolution = null, externalCellColors = null, onCellUpdate, theme }) {
	const cellFilled = theme?.cellFilled ?? "#9b5b7a";
	const cellMark   = theme?.cellMark   ?? "#f7a8c0";
	const cellEmpty  = theme?.cellEmpty  ?? "#fff0f6";
	const cellBorder = theme?.cellBorder ?? "#e8c4d8";
	const clueColor  = theme?.clueColor  ?? "#b07090";
	const winColor   = theme?.winColor   ?? "#84c084";
	const [solution, setSolution] = useState([]);
	const [cellColors, setCellColors] = useState([]);
	const [rowClues, setRowClues] = useState([]);
	const [colClues, setColClues] = useState([]);
	const [win, setWin] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [dragColor, setDragColor] = useState(null);
	const [timer, setTimer] = useState(0);
	const [isRunning, setIsRunning] = useState(!readOnly);

	useEffect(() => {
		const sol = initialSolution || Array.from({ length: size }, () =>
			Array.from({ length: size }, () => Math.random() < 0.5)
		);
		setSolution(sol);
		setCellColors(Array.from({ length: size }, () => Array(size).fill("white")));
		const { rowClues, colClues } = calcClues(sol, size);
		setRowClues(rowClues);
		setColClues(colClues);
	}, [size]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (readOnly) return;
		let interval;
		if (isRunning) interval = setInterval(() => setTimer((t) => t + 1), 1000);
		return () => clearInterval(interval);
	}, [isRunning, readOnly]);

	const colorAt = (i, j) =>
		(externalCellColors ? externalCellColors[i]?.[j] : cellColors[i]?.[j]) || "white";

	const renderColumnClues = () => (
		<tr>
			<td></td>
			{colClues.map((clue, index) => (
				<td key={index} className="text-center text-xl font-semibold pb-1" style={{ color: clueColor }}>
					{clue.map((num, ci) => <div key={ci}>{num}</div>)}
				</td>
			))}
		</tr>
	);

	const updateCellColor = (i, j, color) => {
		setCellColors((prev) =>
			prev.map((row, ri) => row.map((c, ci) => (ri === i && ci === j ? color : c)))
		);
		onCellUpdate?.(i, j, color);
	};

	const handleMouseDown = (i, j, event) => {
		if (readOnly) return;
		event.preventDefault();
		setIsDragging(true);
		if (event.button === 0) {
			const next = cellColors[i][j] === "white" ? "black" : "white";
			setDragColor(next);
			updateCellColor(i, j, next);
		} else if (event.button === 2) {
			const next = cellColors[i][j] === "white" ? "red" : "white";
			setDragColor(next);
			updateCellColor(i, j, next);
		}
	};

	const handleMouseMove = (i, j) => {
		if (readOnly || !isDragging || dragColor === null) return;
		updateCellColor(i, j, dragColor);
	};

	const handleMouseUp = () => {
		if (readOnly) return;
		setIsDragging(false);
		checkWin(cellColors);
	};

	const checkWin = (currentColors) => {
		const isWin = solution.every((row, i) =>
			row.every((cell, j) => (cell ? currentColors[i][j] === "black" : currentColors[i][j] !== "black"))
		);
		setWin(isWin);
		if (isWin) {
			setIsRunning(false);
			onWin?.(timer);
		}
	};

	const clearBoard = () => {
		setCellColors(Array.from({ length: size }, () => Array(size).fill("white")));
		setWin(false);
		setTimer(0);
		setIsRunning(true);
	};

	const createTable = () => {
		if (solution.length === 0) return null;
		return Array.from({ length: size }, (_, i) => (
			<tr key={i}>
				<td className="text-right pr-3 text-xl font-semibold" style={{ color: clueColor }}>
					{rowClues[i]?.join(" ")}
				</td>
				{Array.from({ length: size }, (_, j) => (
					<td
						key={`${i}-${j}`}
						className="w-12 h-12"
						style={{
							backgroundColor:
								colorAt(i, j) === "black" ? cellFilled
								: colorAt(i, j) === "red" ? cellMark
								: cellEmpty,
							border: `1.5px solid ${cellBorder}`,
							cursor: readOnly ? "default" : "crosshair",
						}}
						onMouseDown={(e) => handleMouseDown(i, j, e)}
						onMouseMove={() => handleMouseMove(i, j)}
						onMouseUp={handleMouseUp}
						onContextMenu={(e) => e.preventDefault()}
					/>
				))}
			</tr>
		));
	};

	return (
		<div className="flex flex-col items-center">
			{!readOnly && (
				<>
					<h1 className="text-3xl font-extrabold mb-1" style={{ color: win ? winColor : clueColor }}>
						{win ? "🎉 You Win!" : "✏️ Solve the puzzle"}
					</h1>
					<div className="text-lg font-medium mb-2" style={{ color: clueColor }}>
						⏱ {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
					</div>
					<button
						onClick={clearBoard}
						className="mb-4 text-sm font-semibold rounded-full px-5 py-1 shadow-sm transition-transform hover:scale-105"
						style={{ background: cellBorder, color: clueColor }}
					>
						Clear Board
					</button>
				</>
			)}
			<div className="relative rounded-2xl p-4 shadow-md" style={{ background: theme ? "transparent" : "rgba(255,255,255,0.55)" }}>
				<table
					className="border-collapse"
					style={{ filter: blurred ? "blur(28px)" : "none", userSelect: blurred ? "none" : "auto" }}
					onMouseLeave={handleMouseUp}
				>
					<thead>{renderColumnClues()}</thead>
					<tbody>{createTable()}</tbody>
				</table>
				{blurred && (
					<div className="absolute inset-0 flex items-center justify-center rounded-2xl"
						style={{ background: "rgba(255,240,246,0.3)" }}>
						<span className="text-2xl">🔒</span>
					</div>
				)}
			</div>
		</div>
	);
}

Board.propTypes = {
	size: PropTypes.number.isRequired,
	onWin: PropTypes.func,
	blurred: PropTypes.bool,
	readOnly: PropTypes.bool,
	initialSolution: PropTypes.array,
	externalCellColors: PropTypes.array,
	onCellUpdate: PropTypes.func,
	theme: PropTypes.object,
};

export default Board;
