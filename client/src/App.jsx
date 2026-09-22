import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import SinglePlayer from "./pages/SinglePlayer";
import Multiplayer from "./pages/Multiplayer";
import MultiplayerLobby from "./pages/MultiplayerLobby";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/play" element={<SinglePlayer />} />
				<Route path="/multiplayer" element={<Multiplayer />} />
				<Route path="/multiplayer/:roomCode" element={<MultiplayerLobby />} /> {/* ✅ Ensure this route exists */}
			</Routes>
		</Router>
	);
}

export default App;
