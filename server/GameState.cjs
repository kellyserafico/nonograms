const schema = require("@colyseus/schema");
const { Schema, MapSchema, ArraySchema, type } = schema;

class Player extends Schema {
	constructor() {
		super();
		this.board = new ArraySchema(...Array(100).fill(0)); // Flattened 10x10 board
	}
}
type(["uint8"])(Player.prototype, "board"); // ✅ CommonJS-friendly version

class GameState extends Schema {
	constructor() {
		super();
		this.players = new MapSchema();
		this.gameStarted = false;
	}
}
type({ map: Player })(GameState.prototype, "players"); // ✅ Apply type dynamically
type("boolean")(GameState.prototype, "gameStarted");

module.exports = { GameState, Player };
