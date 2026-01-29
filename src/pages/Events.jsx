import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function Events() {
  return (
    <>
      <div className="header-container">
        <h1 className="font-paprika text-green-400 flex justify-center">Events (scroll down for more)</h1>
      </div>
      <div className="events-frame" style={{ width: '100%', overflowX: 'auto' }}>
        <iframe 
          src="https://docs.google.com/spreadsheets/d/e/2PACX-1vS9x5ni-fHVeoATVB5LeKZCGXmx47HK528AZu9rv1tO_QNSo8489zw72n6Tc7Mc3n2u0kIMB__ZoRo5/pubhtml?gid=0&single=true&amp;widget=true&amp;headers=false"
          width="100%"
          height="1250"
        ></iframe>
      </div>
    </>
  );
}

export default Events;