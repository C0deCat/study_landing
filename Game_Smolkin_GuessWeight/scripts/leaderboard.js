import { loadLeaderboard, ensureLeaderboard } from "./game-data.js";

const leaderboardList = document.querySelector("#leaderboardList");

ensureLeaderboard();
const leaderboard = loadLeaderboard();

leaderboardList.innerHTML = "";

leaderboard.forEach((entry, index) => {
  const item = document.createElement("li");
  item.className = "leaderboard-entry";
  item.innerHTML = `
    <span class="leaderboard-rank">${index + 1}</span>
    <span>${entry.name}</span>
    <strong>${entry.score}</strong>
  `;
  leaderboardList.appendChild(item);
});
