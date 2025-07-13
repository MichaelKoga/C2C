import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import c2c_logo from "./assets/C2C_logo.png";

import Home from "./pages/Home";
import Events from "./pages/Events";
import Leaderboard from "./pages/Leaderboard";

function App() {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const API_URL = import.meta.env.VITE_API_URL;

  return (
    <div>
      <Router>
        <nav className={`navbar ${scrolled ? "navbar-solid" : ""}`}>
          <h1>Coast2Coast</h1>
          <ul>
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="events">Events</a>
            </li>
            <li>
              <a href="leaderboard">Leaderboard</a>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </Router>

      <div className="footer-container">
        <h4>© Coast2Coast 2025. All rights reserved.</h4>
      </div>
    </div>
  );
}

export default App;
