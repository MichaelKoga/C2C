import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function Events() {
  return (
    <>
      <div className="header-container">
        <h1 className="flex justify-center">Events</h1>
      </div>
      <div className="events-frame" style={{ width: '100%', overflowX: 'auto' }}>
        <iframe 
          src="https://docs.google.com/spreadsheets/d/e/2PACX-1vRM4K49AqQTJWvuBNLVVpRwjGLryUNJSPsolJuJryYYEOJ5e_UtDITlSbmfNwHAdiPfYxtVRy4daYYk/pubhtml?gid=1649049611&amp;single=true&amp;widget=true&amp;headers=false"
          width="100%"
          height="1250"
        ></iframe>
      </div>
    </>
  );
}

export default Events;