// To support the use of snapshots
// const API_BASE = 
//   import.meta.env.PROD
//     ? "/api"
//     : "http://localhost:5173/api";

// export const tournamentApi = () => `${API_BASE}/leaderboard/tournament`;
// export const leaderboardByIdApi = (id) => `${API_BASE}/leaderboard/${id}`;
// export const leaderboardApi = () => `${API_BASE}/leaderboard`
// export const handicapApi = (date) => `${API_BASE}/leaderboard/${date}`;

export const tournamentApi = () => "api/leaderboard/tournament";
export const leaderboardByIdApi = (id) => `api/leaderboard/${id}`;
export const leaderboardApi = () => "api/leaderboard";
export const handicapApi = (date) => `api/leaderboard/${date}`;