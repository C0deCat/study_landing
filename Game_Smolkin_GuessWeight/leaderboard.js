import { getLeaderboard, initLeaderboard } from "./data.js";

const tableBody = document.querySelector("#leaderboard-body");

initLeaderboard();

const entries = getLeaderboard();

tableBody.innerHTML = "";
entries.forEach((entry, index) => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${index + 1}</td>
    <td>${entry.name}</td>
    <td>${entry.score}</td>
    <td>${entry.difficulty}</td>
    <td>${entry.timed ? "Да" : "Нет"}</td>
  `;
  tableBody.appendChild(row);
});
