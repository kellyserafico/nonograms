let currentRoom = null;
let currentPlayerName = null;
let currentIsHost = false;

export const setRoom = (room, playerName, isHost = false) => {
	currentRoom = room;
	currentPlayerName = playerName;
	currentIsHost = isHost;
};

export const getRoom = () => currentRoom;
export const getPlayerName = () => currentPlayerName;
export const getIsHost = () => currentIsHost;
export const setIsHost = (val) => { currentIsHost = val; };

export const clearRoom = () => {
	currentRoom = null;
	currentPlayerName = null;
	currentIsHost = false;
};
