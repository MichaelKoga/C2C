import React, { useState } from "react";
import SingleLeaderboard from "./SingleLeaderboard";

function Leaderboard() {
  const [currentTournamentId, setCurrentTournamentId] = useState(null);
  const [archivedTournamentId, setArchivedTournamentId] = useState(null);

  return (
    <>
      <div className="header-container">
        <SingleLeaderboard
          title="Current Leaderboards"
          type="current"
          selectedTournamentId={currentTournamentId}
          setSelectedTournamentId={setCurrentTournamentId}
          sortFn={(a, b) => new Date(a.end_date) - new Date(b.end_date)}
          filterFn={(t) => new Date(t.end_date) >= new Date()}
        />
      </div>
      <div className="middle-container">
        <SingleLeaderboard
          title="Archived Leaderboards"
          type="archived"
          selectedTournamentId={archivedTournamentId}
          setSelectedTournamentId={setArchivedTournamentId}
          sortFn={(a, b) => new Date(b.end_date) - new Date(a.end_date)}
          filterFn={(t) => new Date(t.end_date) < new Date()}
          flipped
        />
      </div>
    </>
  );
}

export default Leaderboard;