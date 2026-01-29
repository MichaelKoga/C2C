// To support the use of snapshots
const API_BASE = 
  import.meta.env.PROD
    ? "/api"
    : "http://localhost:5173/api";

export const tournamentApi = () => `${API_BASE}/leaderboard/tournaments`;
export const leaderboardByIdApi = (id) => `${API_BASE}/leaderboard/${id}`;
export const leaderboardApi = () => `${API_BASE}/leaderboard`
export const handicapApi = (date) => `${API_BASE}/handicaps/${date}`;