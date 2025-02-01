const colyseus = require("colyseus");
const { createServer } = require("http");
const express = require("express");
const path = require("path");
const { GameRoom } = require("./GameRoom.cjs");

const app = express();
const port = 3001;
const server = createServer(app);
const gameServer = new colyseus.Server({ server });

gameServer.define("game_room", GameRoom);

// ✅ Serve React frontend from `nonograms/dist`
app.use(express.static(path.join(__dirname, "../nonograms/dist")));

// ✅ Redirect all unknown routes to React frontend
app.get("*", (req, res) => {
	res.sendFile(path.resolve(__dirname, "../nonograms/dist/index.html"));
});

// Start the server
server.listen(port, () => {
	console.log(`✅ Colyseus server running at http://localhost:${port}`);
});
