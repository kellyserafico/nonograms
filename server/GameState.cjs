const schema = require("@colyseus/schema");
const { Schema, type, MapSchema } = schema;

class Player extends Schema {
	constructor(name) {
		super();
		this.name = name;
	}
}
type("string")(Player.prototype, "name");

class GameState extends Schema {
	constructor() {
		super();
		this.players = new MapSchema();
		this.gameStarted = false;
	}
}
type({ map: Player })(GameState.prototype, "players");
type("boolean")(GameState.prototype, "gameStarted");

module.exports = { GameState, Player };
