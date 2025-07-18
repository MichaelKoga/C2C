import { useEffect, useState } from "react";
import axios from "axios";

function SingleLeaderboard({ title, type, selectedTournamentId, setSelectedTournamentId, sortFn, filterFn, flipped = false }) {
  const [tournaments, setTournaments] = useState([]);
  const [playersPage, setPlayersPage] = useState(1);
  const [playersPerPage] = useState(10);
  const [players, setPlayers] = useState([]);
  const [displayMode, setDisplayMode] = useState("F9");
  const [handicapMode, setHandicapMode] = useState(false);

  // Compute which players to show on the current page
  const startIndex = (playersPage - 1) * playersPerPage;
  const currentPlayers = players.slice(startIndex, startIndex + playersPerPage);
  const totalPages = Math.ceil(players.length / playersPerPage);

  // Set default leaderboard upon rendering the page
  useEffect(() => {
  if (!selectedTournamentId && tournaments.length > 0) {
    let defaultTournament;

    if (type === "current") {
      defaultTournament = tournaments
        .filter(t => new Date(t.end_date) >= new Date())
        .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))[0]; // soonest ending
    } 

    if (defaultTournament) {
      setSelectedTournamentId(defaultTournament._id);
    }
  }
}, [type, tournaments, selectedTournamentId]);

  // Fetch all tournaments for dropdown on load
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/leaderboard/tournaments")
      .then(res => {
        setTournaments(res.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const tournament = tournaments.find(t => t._id === selectedTournamentId);

    if (tournament?.type !== "Stonehenge") {
      setDisplayMode("Total"); // reset mode
    }
    else if (!["F9", "B9", "F18", "Total"].includes(displayMode)) {
      setDisplayMode("F9");
    }
  }, [selectedTournamentId, tournaments]);

  const selectedTournament = tournaments.find(t => t._id === selectedTournamentId);

  // Check if end_date is July 2025 or later
  const showHandicappedOption = (() => {
    if (!selectedTournament?.end_date) return false;
    const endDate = new Date(selectedTournament.end_date);
    const july2025 = new Date("2025-07-01");
    return endDate >= july2025;
  })();

  // Fetch the selected tournament player data when selection changes
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedTournamentId) return;

      const selectedTournament = tournaments.find(t => t._id === selectedTournamentId);
      if (!selectedTournament) return;

      const endDate = new Date(selectedTournament.end_date).toISOString().split("T")[0];
      
      console.log("End date: ", endDate);

      const getScore = (p) => {
        if (p.cumulativeTotal !== undefined) return p.cumulativeTotal;
        if (p.total !== undefined) return p.total;
        return 99999; // fallback to prevent breaking if missing
      };

      const assignRanks = (players, getScore) => {
        let visibleRank = 1;
        let tieCount = 0;
        let lastScore = null;

        players = players.map((p, i) => {
          const currScore = getScore(p);
          let assignedRank;

          if (i === 0) {
            assignedRank = visibleRank;
            tieCount = 1;
          }
          else if (currScore === lastScore) {
            assignedRank = null;
            tieCount++;
          }
          else {
            visibleRank += tieCount; // set the next rank to previous plus ties
            assignedRank = visibleRank;
            tieCount = 1; // reset number of ties to 1
          }

          lastScore = currScore;

          return {...p, rank: assignedRank};
        });

        return players;
      };

      axios
        .get(`http://localhost:5000/api/leaderboard/${selectedTournamentId}`)
        .then((res) => { 
          console.log("API response:", res.data);
          let fetchedPlayers = res.data.players || [];
          console.log("Fetched players:", fetchedPlayers);

          const tournament = tournaments.find(t => t._id === selectedTournamentId);

          // Sort the leaderboard data
          if (tournament?.type === "Stonehenge") {
            const getSum = (arr) => 
              arr.filter(x => !isNaN(parseInt(x))).reduce((sum, val) => sum + parseInt(val), 0);
            
            fetchedPlayers = fetchedPlayers.map(p => {
              const F9Total = getSum(p.F9);
              const B9Total = getSum(p.B9);
              const F18Total = getSum(p.F18);
              const cumulativeTotal = F9Total + B9Total + F18Total;
              
              const numValid = [...p.F9, ...p.B9, ...p.F18]
                .filter(x => !isNaN(parseInt(x))).length;

              p.numValid = numValid;

              const maxPossible = [...p.F9, ...p.B9, ...p.F18].length;
              const isComplete = numValid === maxPossible;

              return { 
                ...p, 
                F9Total,
                B9Total,
                F18Total,
                cumulativeTotal, 
                numValid,
                isComplete };
            })
            .filter(p => p.cumulativeTotal > 0)
            .sort((a, b) => {
              // Sort by completion of most rounds, then by cumulative total ascending
              if (a.isComplete && !b.isComplete) return -1;
              if (!a.isComplete && b.isComplete) return 1;
              if (b.numValid !== a.numValid) return b.numValid - a.numValid;
              
              switch (displayMode) {
                case 'F9':
                  return a.F9Total - b.F9Total;
                case 'B9':
                  return a.B9Total - b.B9Total;
                case 'F18':
                  return a.F18Total - b.F18Total;
                case 'Total':
                  return a.cumulativeTotal - b.cumulativeTotal
                default:
                  return 0;
              }
            });
          }
          else if (tournament?.type === "Tour")
          {
            fetchedPlayers = fetchedPlayers.map(p => {
              const F9 = isNaN(parseInt(p.F9)) ? 0 : parseInt(p.F9);
              const B9 = isNaN(parseInt(p.B9)) ? 0 : parseInt(p.B9);
              const F18 = isNaN(parseInt(p.F18)) ? 0 : parseInt(p.F18);
              const total = F9 + B9 + F18;

              const scores = [p.F9, p.B9, p.F18];
              const numValid = scores.filter(x => !isNaN(parseInt(x))).length;

              p.numValid = numValid;

              const maxPossible = scores.length;
              const isComplete = numValid === maxPossible;

              return { 
                ...p, 
                total, 
                numValid,
                isComplete };
            })
            .filter(p => p.total > 0)
            .sort((a, b) => {
              // Sort by completion of most rounds, then by cumulative total ascending
              if (a.isComplete && !b.isComplete) return -1;
              if (!a.isComplete && b.isComplete) return 1;
              if (b.numValid !== a.numValid) return b.numValid - a.numValid;
              
              return a.total - b.total;     
            });
          }

          // If handicapped mode is enabled
          if (handicapMode && showHandicappedOption) {
            axios
              .get(`http://localhost:5000/api/handicaps/${endDate}`)
              .then(hcapRes => {
                console.log("handicap API response:", hcapRes.data);

                const handicapMap = {};
                for (const entry of hcapRes.data.handicaps) {
                  handicapMap[entry.name] = entry.avg_handicap;
                }

                fetchedPlayers = fetchedPlayers.map(p => {
                  const playerHandicap = handicapMap[p.name] || 0;
                  const halfHandicap = playerHandicap / 2; // For 9 holes

                  // Apply handicaps (negative handicaps increases score)
                  if (tournament?.type === "Stonehenge") {
                    // Adjust individual rounds
                    const adjustedF9 = (p.F9 || []).map(score => {
                      const numScore = parseFloat(score);
                      if (isNaN(numScore)) return score; // skip adjustment
                      const finalScore = numScore - halfHandicap;
                      return Math.round(finalScore);
                    });
                    const adjustedB9 = (p.B9 || []).map(score => {
                      const numScore = parseFloat(score);
                      if (isNaN(numScore)) return score; // skip adjustment
                      const finalScore = numScore - halfHandicap;
                      return Math.round(finalScore);
                    });
                    const adjustedF18 = (p.F18 || []).map(score => {
                      const numScore = parseFloat(score);
                      if (isNaN(numScore)) return score; // skip adjustment
                      const finalScore = numScore - playerHandicap;
                      return Math.round(finalScore);
                    });

                    // Adjust totals accordingly
                    const F9Total = adjustedF9.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
                    const B9Total = adjustedB9.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
                    const F18Total = adjustedF18.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
                    const cumulativeTotal = F9Total + B9Total + F18Total;

                    return {
                      ...p,
                      F9: adjustedF9,
                      B9: adjustedB9,
                      F18: adjustedF18,
                      F9Total,
                      B9Total,
                      F18Total,
                      cumulativeTotal,
                    };
                  } 
                  else if (tournament?.type === "Tour") {
                    const adjustedF9 = isNaN(parseFloat(p.F9)) ? p.F9 : Math.round(p.F9 - halfHandicap);
                    const adjustedB9 = isNaN(parseFloat(p.B9)) ? p.B9 : Math.round(p.B9 - halfHandicap);
                    const adjustedF18 = isNaN(parseFloat(p.F18)) ? p.F18 : Math.round(p.F18 - playerHandicap);

                    const total =
                      (typeof adjustedF9 === "number" ? adjustedF9 : 0) +
                      (typeof adjustedB9 === "number" ? adjustedB9 : 0) +
                      (typeof adjustedF18 === "number" ? adjustedF18 : 0);

                    return {
                      ...p,
                      F9: adjustedF9,
                      B9: adjustedB9,
                      F18: adjustedF18,
                      total,
                    };
                  }
                  return p;
                });
                
                fetchedPlayers.sort((a, b) => {
                  // Sort by completion of most rounds, then by cumulative total ascending
                  if (a.isComplete && !b.isComplete) return -1;
                  if (!a.isComplete && b.isComplete) return 1;
                  if (b.numValid !== a.numValid) return b.numValid - a.numValid;
                  
                  if (tournament?.type === "Tour") {
                    return a.total - b.total;
                  }
                  else if (tournament?.type === "Stonehenge") {
                    switch (displayMode) {
                      case 'F9':
                        return a.F9Total - b.F9Total;
                      case 'B9':
                        return a.B9Total - b.B9Total;
                      case 'F18':
                        return a.F18Total - b.F18Total;
                      case 'Total':
                        return a.cumulativeTotal - b.cumulativeTotal;
                      default:
                        return 0;
                    }
                  }
                });
                const rankedPlayers = assignRanks(fetchedPlayers, getScore);

                setPlayers(rankedPlayers);
                setPlayersPage(1); // reset page on tournament change
            })
            .catch((err) => console.error("Error fetching handicaps:", err));
          }
          else {
            const rankedPlayers = assignRanks(fetchedPlayers, getScore);

            setPlayers(rankedPlayers);
            setPlayersPage(1); // reset page on tournament change
          }
      })
      .catch(err => console.error("Error fetching leaderboards:", err));
    };

    fetchData();
  }, [selectedTournamentId, tournaments, displayMode, handicapMode]);

  // Reset the handicap mode option for older leaderboards where handicaps have not been implemented.
  useEffect(() => {
    if (!showHandicappedOption && handicapMode) {
      setHandicapMode(false);
    }
  }, [showHandicappedOption]);

  const containerClass = flipped
    ? "leaderboard-container-flipped p-4"
    : "leaderboard-container p-4";

  const maxNameLength = Math.max(...players.map(p => (p.name?.length || 0)));
  const formatScore = (score) => {
    return score === "Not Entered" ? "-" : score;
  }

  return (
    <>
      <div className={containerClass}>
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <div className="flex justify-center">
          <select
            className="dropdown-menu"
            value={selectedTournamentId || ""}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
          >
            <option value="" disabled>Select a tournament</option>
            {[...tournaments]
              .filter(filterFn)
              .sort(sortFn)
              .map(t => (
                <option key={t._id} value={t._id}>
                  {t.tourney_id} ({t.end_date})
                </option>
            ))}
          </select>
        </div>
        {players.length === 0 ? (
          <p className="text-red-500">No data available</p>
        ) : (
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              {tournaments.find(t => t._id === selectedTournamentId)?.tourney_id}
            </h2>
            {showHandicappedOption && (
              <div className="flex justify-center my-2 gap-2 items-center">
                <span className="scratch-label">Scratch</span>
                <label className="switch relative">
                  <input
                    id="handicapToggle"
                    type="checkbox"
                    checked={handicapMode}
                    onChange={() => setHandicapMode((prev) => !prev)}
                  />
                  <span className="slider"></span>
                </label>
                <span className="handicap-label">Handicap</span>
              </div>
            )}
            {tournaments.find(t => t._id === selectedTournamentId)?.type === "Stonehenge" && (
              <div className="radio-buttons">
                {["F9", "B9", "F18", "Total"].map((mode) => (
                  <label key={mode} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="displayMode"
                      value={mode}
                      checked={displayMode === mode}
                      onChange={() => setDisplayMode(mode)}
                    />
                    {mode}
                  </label>
                ))}
              </div>
            )}
            <div className="table-container">
              <table key={selectedTournamentId}>
                {selectedTournament?.type === "Stonehenge" && displayMode === "Total" ? (
                  <>
                    <thead>
                      <tr className="bg-gray-200">
                        <th rowSpan={2} className="score-cell">Rank</th>
                        <th rowSpan={2} className="player-cell">Player</th>
                        <th colSpan={4} className="score-cell">F9</th>
                        <th colSpan={4} className="score-cell">B9</th>
                        <th colSpan={4} className="score-cell">F18</th>
                        <th rowSpan={2} className="score-cell">Final</th>
                      </tr>
                      <tr className="bg-gray-100">
                        {["R1", "R2", "R3", "R4"].map((r, i) => <th key={`f9-${i}`} className="text-center">{r}</th>)}
                        {["R1", "R2", "R3", "R4"].map((r, i) => <th key={`b9-${i}`} className="text-center">{r}</th>)}
                        {["R1", "R2", "R3", "R4"].map((r, i) => <th key={`f18-${i}`} className="text-center">{r}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {currentPlayers.map((p) => {
                        const F9 = Array.isArray(p.F9) ? p.F9 : [0, 0, 0, 0];
                        const B9 = Array.isArray(p.B9) ? p.B9 : [0, 0, 0, 0];
                        const F18 = Array.isArray(p.F18) ? p.F18 : [0, 0, 0, 0];
                        const total = p.cumulativeTotal ?? 0;

                        return (
                          <tr key={p.name}>
                            <td className="score-cell">{p.rank !== null ? p.rank : ""}</td>
                            <td className="player-cell">{p.name}</td>
                            {[...F9, ...B9, ...F18].map((v, i) => (
                              <td key={i} className="score-cell">{v}</td>
                            ))}
                            <td className="score-cell">{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                ) : selectedTournament?.type === "Stonehenge" ? (
                  <>
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="score-cell">Rank</th>
                        <th className="player-cell">Player</th>
                        <th className="score-cell">R1</th>
                        <th className="score-cell">R2</th>
                        <th className="score-cell">R3</th>
                        <th className="score-cell">R4</th>
                        <th className="score-cell">Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPlayers.map((p) => {
                        let roundArray = [];
                        let total = 0;

                        switch (displayMode) {
                          case "F9":
                            roundArray = p.F9;
                            total = p.F9Total;
                            break;
                          case "B9":
                            roundArray = p.B9;
                            total = p.B9Total;
                            break;
                          case "F18":
                            roundArray = p.F18;
                            total = p.F18Total;
                            break;
                          default:
                            roundArray = [];
                            total = 0;
                        }

                        return (
                          <tr key={p.name}>
                            <td className="score-cell">{p.rank !== null ? p.rank : ""}</td>
                            <td className="player-cell">{p.name}</td>
                            {roundArray.map((val, i) => (
                              <td key={i} className="score-cell">{val}</td>
                            ))}
                            <td className="score-cell">{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                ) : selectedTournament?.type === "Tour" ? (
                  <>
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="score-cell">Rank</th>
                        <th className="player-cell">Player</th>
                        <th className="score-cell">F9</th>
                        <th className="score-cell">B9</th>
                        <th className="score-cell">F18</th>
                        <th className="score-cell">Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPlayers.map((p) => {
                        return (
                          <tr key={p.name}>
                            <td className="score-cell">{p.rank !== null ? p.rank : ""}</td>
                            <td className="player-cell">{p.name}</td>
                            <td className="score-cell">{formatScore(p.F9)}</td>
                            <td className="score-cell">{formatScore(p.B9)}</td>
                            <td className="score-cell">{formatScore(p.F18)}</td>
                            <td className="score-cell">{p.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                ) : null}
              </table>
            </div>
          </div>
        )}
        <button onClick={() => setPlayersPage(p => Math.max(p - 1, 1))} disabled={playersPage === 1}>
          &lt; Prev
        </button>
        <button onClick={() => setPlayersPage(p => Math.min(p + 1, totalPages))} disabled={playersPage === totalPages}>
          Next &gt;
        </button>
      </div>
    </>
  );
}

export default SingleLeaderboard;