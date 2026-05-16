import { Client } from "colyseus.js";

const SERVER_URL = "ws://localhost:3001"; // WebSocket connection

export const colyseusClient = new Client(SERVER_URL);
