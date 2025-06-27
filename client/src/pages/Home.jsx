import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import c2c_logo from "../assets/C2C_logo.png";

function Home() {
  return (
    <>
      <div className="header-container">
        <div className="image-container">
          <img className="C2C-image" src={c2c_logo} alt="C2C" />
        </div>
      </div>
      <div className="hero-content"></div>
    </>
  );
}

export default Home;