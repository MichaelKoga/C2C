import { useEffect, useState } from "react";
import axios from "axios";

function Leaderboard() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [playersPage, setPlayersPage] = useState(1);
  const [playersPerPage] = useState(10);
  const [players, setPlayers] = useState([]);
  const [displayMode, setDisplayMode] = useState("F9");

  // Compute which players to show on the current page
  const startIndex = (playersPage - 1) * playersPerPage;
  const currentPlayers = players.slice(startIndex, startIndex + playersPerPage);
  const totalPages = Math.ceil(players.length / playersPerPage);
  // Get the selected tournament
  const selectedTournament = tournaments.find(t => t._id === selectedTournamentId);

  // Fetch all tournaments for dropdown on load
  useEffect(() => {
    axios.get("http://localhost:5000/api/leaderboard/tournaments")
      .then(res => {
        const sorted = res.data.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        setTournaments(sorted);
      })
      .catch(console.error);
  }, []);

  // Fetch the selected tournament player data when selection changes
  useEffect(() => {
    if (!selectedTournamentId) return;
    axios
      .get(`http://localhost:5000/api/leaderboard/${selectedTournamentId}`)
      .then((res) => { 
        console.log("API response:", res.data);
        let fetchedPlayers = res.data.players || [];
        
        if (selectedTournament?.type === "Stonehenge") {
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
        else if (selectedTournament?.type === "Tour")
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
        else {
          console.error("Error: leaderboard not of type Stonehenge or Tour (skip)");
        }
        
        setPlayers(fetchedPlayers);
        setPlayersPage(1); // reset page on tournament change
      })
      .catch((err) => console.error("Error fetching leaderboard:", err));
  }, [selectedTournamentId, tournaments, displayMode]);

  return (
    <>
      <div className="header-container">
        <div className="leaderboard-container">
          <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
            <select
              value={selectedTournamentId || ""}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
            >
              <option value="" disabled>Select a tournament</option>
              {tournaments.map(t => (
                <option key={t._id} value={t._id}>{t.tourney_id}</option>
              ))}
            </select>
            {players.length === 0 ? (
              <p className="text-red-500">No data available</p>
            ) : (
              <div className="mb-6">
                <h2 className="text-xl font-semibold">
                  {tournaments.find(t => t._id === selectedTournamentId)?.tourney_id}
                </h2>
                {tournaments.find(t => t._id === selectedTournamentId)?.type === "Stonehenge" && (
                  <div className="flex gap-4 my-2">
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
                <table className="w-full mt-2 border">
                  <thead>
                    {selectedTournament?.type === "Stonehenge" && displayMode === "Total" ? (
                      <>
                        <tr className="bg-gray-200">
                          <th rowSpan={2} className="text-left p-2">Player</th>
                          <th colSpan={4} className="text-center">F9</th>
                          <th colSpan={4} className="text-center">B9</th>
                          <th colSpan={4} className="text-center">F18</th>
                          <th rowSpan={2} className="text-center">Final</th>
                        </tr>
                        <tr className="bg-gray-100">
                          <th className="text-center">R1</th>
                          <th className="text-center">R2</th>
                          <th className="text-center">R3</th>
                          <th className="text-center">R4</th>
                          <th className="text-center">R1</th>
                          <th className="text-center">R2</th>
                          <th className="text-center">R3</th>
                          <th className="text-center">R4</th>
                          <th className="text-center">R1</th>
                          <th className="text-center">R2</th>
                          <th className="text-center">R3</th>
                          <th className="text-center">R4</th>
                        </tr>
                      </>
                    ) : selectedTournament?.type === "Stonehenge" ? (
                      <tr className="bg-gray-200">
                        <th className="text-left p-2">Player</th>
                        <th className="text-center">R1</th>
                        <th className="text-center">R2</th>
                        <th className="text-center">R3</th>
                        <th className="text-center">R4</th>
                        <th className="text-center">Final</th>
                      </tr>
                    ) : selectedTournament?.type === "Tour" ? (
                      <tr className="bg-gray-200">
                        <th className="text-left p-2">Player</th>
                        <th className="text-center">F9</th>
                        <th className="text-center">B9</th>
                        <th className="text-center">F18</th>
                        <th className="text-center">Final</th>
                      </tr>
                    ) : null}
                  </thead>
                  <tbody>
                    {currentPlayers.map((p) => {
                      if (selectedTournament?.type === "Stonehenge") {
                        // Stonehenge: display a selected round or cumulative total
                        const renderStonehenge = () => {
                          const getSum = arr => arr.filter(x => !isNaN(parseInt(x))).reduce((sum, val) => sum + parseInt(val), 0);
                          const F9Total = getSum(p.F9);
                          const B9Total = getSum(p.B9);
                          const F18Total = getSum(p.F18);

                          switch (displayMode) {
                            case "F9":
                              return <>
                                <td className="text-center">{p.F9[0]}</td>
                                <td className="text-center">{p.F9[1]}</td>
                                <td className="text-center">{p.F9[2]}</td>
                                <td className="text-center">{p.F9[3]}</td>
                                <td className="text-center">{F9Total}</td>
                              </>;
                            case "B9":
                              return <>
                                <td className="text-center">{p.B9[0]}</td>
                                <td className="text-center">{p.B9[1]}</td>
                                <td className="text-center">{p.B9[2]}</td>
                                <td className="text-center">{p.B9[3]}</td>
                                <td className="text-center">{B9Total}</td>
                              </>;
                            case "F18":
                              return <>
                                <td className="text-center">{p.F18[0]}</td>
                                <td className="text-center">{p.F18[1]}</td>
                                <td className="text-center">{p.F18[2]}</td>
                                <td className="text-center">{p.F18[3]}</td>
                                <td className="text-center">{F18Total}</td>
                              </>;
                            case "Total":
                              const total = F9Total + B9Total + F18Total;
                              return <>
                                <td className="text-center">{p.F9[0]}</td>
                                <td className="text-center">{p.F9[1]}</td>
                                <td className="text-center">{p.F9[2]}</td>
                                <td className="text-center">{p.F9[3]}</td>
                                <td className="text-center">{p.B9[0]}</td>
                                <td className="text-center">{p.B9[1]}</td>
                                <td className="text-center">{p.B9[2]}</td>
                                <td className="text-center">{p.B9[3]}</td>
                                <td className="text-center">{p.F18[0]}</td>
                                <td className="text-center">{p.F18[1]}</td>
                                <td className="text-center">{p.F18[2]}</td>
                                <td className="text-center">{p.F18[3]}</td>
                                <td className="text-center">{total}</td>
                              </>;
                            default:
                              return <td colSpan={3}>Invalid Mode</td>;
                          }
                        };

                        return (
                          <tr key={p.name}>
                            <td className="p-2">{p.name}</td>
                            {renderStonehenge()}
                          </tr>
                        );
                      } else {
                        // Tour: single round, show raw values + total
                        const F9 = parseInt(p.F9) || 0;
                        const B9 = parseInt(p.B9) || 0;
                        const F18 = parseInt(p.F18) || 0;
                        const total = F9 + B9 + F18;
                        return (
                          <tr key={p.name}>
                            <td className="p-2">{p.name}</td>
                            <td className="text-center">{p.F9}</td>
                            <td className="text-center">{p.B9}</td>
                            <td className="text-center">{p.F18}</td>
                            <td className="text-center">{total}</td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={() => setPlayersPage(p => Math.max(p - 1, 1))} disabled={playersPage === 1}>
              &lt; Prev
            </button>
            <button onClick={() => setPlayersPage(p => Math.min(p + 1, totalPages))} disabled={playersPage === totalPages}>
              Next &gt;
            </button>
          </div>
        </div>
      </div>
      <div className="hero-content"></div>
    </>
  );
}

export default Leaderboard;