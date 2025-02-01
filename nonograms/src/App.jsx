import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import SinglePlayer from "./pages/SinglePlayer";
import Multiplayer from "./pages/Multiplayer";
function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/play" element={<SinglePlayer />} />
				<Route path="/multiplayer" element={<Multiplayer />} />
				<Route path="/lobby/:roomCode" element={<MultiplayerGame />} />
			</Routes>
		</Router>
	);
}

export default App;
