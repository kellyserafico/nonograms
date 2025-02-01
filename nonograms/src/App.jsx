import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import SinglePlayer from "./pages/SinglePlayer";
//import Multiplayer from "./pages/Multiplayer";
import Lobby from "./pages/Lobby"; // ✅ Add this import
import MultiplayerGame from "./components/MultiplayerGame";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/play" element={<SinglePlayer />} />
				<Route path="/lobby" element={<Lobby />} /> {/* ✅ Add this line */}
				<Route path="/lobby/:roomCode" element={<MultiplayerGame />} />
			</Routes>
		</Router>
	);
}

export default App;
