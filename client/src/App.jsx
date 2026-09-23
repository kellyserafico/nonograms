import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import SinglePlayer from "./pages/SinglePlayer";
import Multiplayer from "./pages/Multiplayer";
import MultiplayerLobby from "./pages/MultiplayerLobby";
import HowToPlay from "./pages/HowToPlay";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/play" element={<SinglePlayer />} />
				<Route path="/multiplayer" element={<Multiplayer />} />
				<Route path="/multiplayer/:roomCode" element={<MultiplayerLobby />} />
				<Route path="/how-to-play" element={<HowToPlay />} />
			</Routes>
		</Router>
	);
}

export default App;
