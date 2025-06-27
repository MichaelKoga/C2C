import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function Leaderboard() {
  return (
    <>
      <div className="header-container">
        <div className="leaderboard-container">
          <h1>Leaderboard</h1>
        </div>
      </div>
      <div className="hero-content"></div>
    </>
  );
}

export default Leaderboard;