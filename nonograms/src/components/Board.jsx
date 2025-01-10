import PropTypes from "prop-types";
import { useState } from "react";

function Board({ size }) {
	const [cellColors, setCellColors] = useState(Array(size).fill(Array(size).fill("white")));

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
	};

	const createTable = () => {
		let table = [];
		for (let i = 0; i < size; i++) {
			let row = [];
			for (let j = 0; j < size; j++) {
				row.push(
					<td
						key={`${i}-${j}`}
						className="border border-black w-20 h-20"
						style={{ backgroundColor: cellColors[i][j] }}
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
		<table className="border-collapse">
			<tbody>{createTable()}</tbody>
		</table>
	);
}

Board.propTypes = {
	size: PropTypes.number.isRequired,
};

export default Board;
