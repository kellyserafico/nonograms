const colyseus = require("colyseus");
const { createServer } = require("http");
const express = require("express");
const path = require("path");
const { GameRoom } = require("./GameRoom.cjs");

const app = express();
const port = 3001;
const server = createServer(app);
const gameServer = new colyseus.Server({ server });

gameServer.define("game_room", GameRoom); // ✅ Defines "game_room"

app.use(express.static(path.join(__dirname, "../nonograms/dist")));
app.get("*", (req, res) => {
	res.sendFile(path.resolve(__dirname, "../nonograms/dist/index.html"));
});

server.listen(port, () => {
	console.log(`✅ Colyseus server running at http://localhost:${port}`);
});
