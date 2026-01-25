const tableBody = document.querySelector("#leaderboard-body");

initLeaderboard();

function loadEntryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("result");
  if (!encoded) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(decoded);
    window.history.replaceState({}, "", window.location.pathname);
    return parsed;
  } catch (error) {
    return null;
  }
}

function isSameEntry(entry, other) {
  return (
    entry?.name === other?.name &&
    entry?.score === other?.score &&
    entry?.difficulty === other?.difficulty &&
    entry?.timed === other?.timed
  );
}

const pendingEntry = loadEntryFromUrl();
let entries = getLeaderboard();
if (pendingEntry && !entries.some((entry) => isSameEntry(entry, pendingEntry))) {
  entries = addLeaderboardEntry(pendingEntry);
}

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
