import React from "react";
import { useState } from "react";
import Board from "../components/Board";
function Home() {
	return (
		<div>
			<h1>Nonograms</h1>
			<button onClick={() => (window.location.href = "/play")}>Single Player</button>
			<button>Multiplayer</button>
		</div>
	);
}

export default Home;
