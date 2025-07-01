import { useEffect, useState } from "react";
import axios from "axios";

function Leaderboard() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [playersPage, setPlayersPage] = useState(1);
  const [playersPerPage] = useState(10);
  const [players, setPlayers] = useState([]);
  const [displayMode, setDisplayMode] = useState("F9");

  // Compute which players to show on the current page
  const startIndex = (playersPage - 1) * playersPerPage;
  const currentPlayers = players.slice(startIndex, startIndex + playersPerPage);
  const totalPages = Math.ceil(players.length / playersPerPage);
  // const selectedTournament = tournaments.find(t => t._id === selectedTournamentId);

  // Fetch all tournaments for dropdown on load
  useEffect(() => {
    axios.get("http://localhost:5000/api/leaderboard/tournaments")
      .then(res => {
        const sorted = res.data.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
        setTournaments(sorted);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const tournament = tournaments.find(t => t._id === selectedTournamentId);
    setSelectedTournament(tournament || null);

    if (tournament?.type !== "Stonehenge") {
      setDisplayMode("Total"); // reset mode
    }
    else if (!["F9", "B9", "F18", "Total"].includes(displayMode)) {
      setDisplayMode("F9");
    }
  }, [selectedTournamentId, tournaments]);

  // Fetch the selected tournament player data when selection changes
  useEffect(() => {
    if (!selectedTournamentId) return;

    const selectedTournament = tournaments.find(t => t._id === selectedTournamentId);
    if (!selectedTournament) return;
    
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
                <table
                  key={selectedTournamentId} 
                  className="w-full mt-2 border"
                >
                  {selectedTournament?.type === "Stonehenge" && displayMode === "Total" ? (
                    <>
                      <thead>
                        <tr className="bg-gray-200">
                          <th rowSpan={2} className="text-left p-2">Player</th>
                          <th colSpan={4} className="text-center">F9</th>
                          <th colSpan={4} className="text-center">B9</th>
                          <th colSpan={4} className="text-center">F18</th>
                          <th rowSpan={2} className="text-center">Final</th>
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

                          const getSum = (arr) => arr.filter(x => !isNaN(parseInt(x))).reduce((sum, val) => sum + parseInt(val), 0);
                          const F9Total = getSum(F9);
                          const B9Total = getSum(B9);
                          const F18Total = getSum(F18);
                          const total = F9Total + B9Total + F18Total;

                          return (
                            <tr key={p.name}>
                              <td className="p-2">{p.name}</td>
                              {[...F9, ...B9, ...F18].map((v, i) => (
                                <td key={i} className="text-center">{v}</td>
                              ))}
                              <td className="text-center">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </>
                  ) : selectedTournament?.type === "Stonehenge" ? (
                    <>
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="text-left p-2">Player</th>
                          <th className="text-center">R1</th>
                          <th className="text-center">R2</th>
                          <th className="text-center">R3</th>
                          <th className="text-center">R4</th>
                          <th className="text-center">Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPlayers.map((p) => {
                          const getSum = (arr) => arr.filter(x => !isNaN(parseInt(x))).reduce((sum, val) => sum + parseInt(val), 0);
                          const F9Total = getSum(p.F9);
                          const B9Total = getSum(p.B9);
                          const F18Total = getSum(p.F18);

                          let roundArray = [];
                          let total = 0;

                          switch (displayMode) {
                            case "F9":
                              roundArray = p.F9;
                              total = F9Total;
                              break;
                            case "B9":
                              roundArray = p.B9;
                              total = B9Total;
                              break;
                            case "F18":
                              roundArray = p.F18;
                              total = F18Total;
                              break;
                            default:
                              roundArray = [];
                              total = 0;
                          }

                          return (
                            <tr key={p.name}>
                              <td className="p-2">{p.name}</td>
                              {roundArray.map((val, i) => (
                                <td key={i} className="text-center">{val}</td>
                              ))}
                              <td className="text-center">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </>
                  ) : selectedTournament?.type === "Tour" ? (
                    <>
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="text-left p-2">Player</th>
                          <th className="text-center">F9</th>
                          <th className="text-center">B9</th>
                          <th className="text-center">F18</th>
                          <th className="text-center">Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPlayers.map((p) => {
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
                        })}
                      </tbody>
                    </>
                  ) : null}
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