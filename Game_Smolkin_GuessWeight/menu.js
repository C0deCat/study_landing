import {
  STORAGE_KEYS,
  difficulties,
  difficultyOrder,
  initLeaderboard,
  pickRandomAnimals,
} from "./data.js";

const difficultyContainer = document.querySelector("#difficulty-options");
const nameInput = document.querySelector("#player-name");
const nameError = document.querySelector("#name-error");
const timeToggle = document.querySelector("#timed-toggle");
const startButton = document.querySelector("#start-game");

initLeaderboard();

let selectedIndex = 0;
const difficultyButtons = [];

const renderDifficultySettings = () => {
  difficultyContainer.innerHTML = "";

  difficultyOrder.forEach((key, index) => {
    const settings = difficulties[key];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "difficulty-card";
    card.dataset.difficulty = key;
    card.innerHTML = `
    <div class="difficulty-title">${settings.label}</div>
    <p>Попытки: ${settings.attempts}</p>`;

    if (timeToggle.checked) {
      card.innerHTML += `
      <p>Таймер: ${settings.timeLimit} сек.</p>
      <p>Множитель: x${settings.multiplier * 2}</p>
      `;
    } else {
      card.innerHTML += `
      <p>Множитель: x${settings.multiplier}</p>
      `;
    }

    card.addEventListener("click", () => {
      selectDifficulty(index);
    });
    difficultyButtons.push(card);
    difficultyContainer.appendChild(card);
  });
};

renderDifficultySettings();
timeToggle.addEventListener("change", renderDifficultySettings);

function selectDifficulty(index) {
  selectedIndex = index;
  difficultyButtons.forEach((button, idx) => {
    button.classList.toggle("is-selected", idx === selectedIndex);
  });
}

selectDifficulty(selectedIndex);

function createInitialState() {
  const difficultyKey = difficultyOrder[selectedIndex];
  const levelAnimals = pickRandomAnimals([], 5);
  return {
    playerName: nameInput.value.trim(),
    difficulty: difficultyKey,
    timeMode: timeToggle.checked,
    highestDifficulty: difficultyKey,
    baseScore: 0,
    usedAnimals: [...levelAnimals],
    levelAnimals,
    currentIndex: 0,
    attemptsLeft: difficulties[difficultyKey].attempts,
    failedAttemptsCurrent: 0,
    completedAnimals: 0,
  };
}

function startGame() {
  const trimmedName = nameInput.value.trim();
  if (!trimmedName) {
    nameError.textContent = "Введите имя игрока.";
    nameInput.focus();
    return;
  }
  nameError.textContent = "";
  const state = createInitialState();
  localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(state));
  window.location.href = "game.html";
}

startButton.addEventListener("click", startGame);

window.addEventListener("keydown", (event) => {
  if (document.activeElement === nameInput) {
    if (event.key === "Enter") {
      startGame();
    }
    return;
  }
  if (["ArrowRight", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    selectDifficulty((selectedIndex + 1) % difficultyButtons.length);
  }
  if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
    event.preventDefault();
    selectDifficulty(
      (selectedIndex - 1 + difficultyButtons.length) % difficultyButtons.length
    );
  }
  if (event.key === "Enter") {
    startGame();
  }
});
