import {
  STORAGE_KEYS,
  difficulties,
  difficultyOrder,
  modes,
  modeOrder,
  initLeaderboard,
  pickRandomAnimals,
} from "./data.js";

const modeContainer = document.querySelector("#mode-options");
const difficultyContainer = document.querySelector("#difficulty-options");
const nameInput = document.querySelector("#player-name");
const nameError = document.querySelector("#name-error");
const timeToggle = document.querySelector("#timed-toggle");
const startButton = document.querySelector("#start-game");
const leaderboardLink = document.querySelector("#leaderboard-link");

initLeaderboard();

let selectedIndex = 0;
let selectedModeIndex = 0;
let menuFocusIndex = 0;
const modeButtons = [];
const difficultyButtons = [];

const renderModeSettings = () => {
  modeContainer.innerHTML = "";
  modeButtons.length = 0;

  modeOrder.forEach((key, index) => {
    const settings = modes.find((mode) => mode.id === key);
    if (!settings) {
      return;
    }
    const card = document.createElement("button");
    card.type = "button";
    card.className = "difficulty-card";
    card.dataset.mode = key;
    card.innerHTML = `
    <div class="difficulty-title">${settings.modeName}</div>
    <p>Модификатор: x${settings.modeModifier}</p>`;

    card.addEventListener("click", () => {
      selectMode(index);
      setMenuFocus(0);
    });
    card.addEventListener("focus", () => setMenuFocus(0));
    modeButtons.push(card);
    modeContainer.appendChild(card);
  });
  selectMode(selectedModeIndex);
  if (menuFocusIndex === 0) {
    focusCurrentMenuItem();
  }
};

const renderDifficultySettings = () => {
  difficultyContainer.innerHTML = "";
  difficultyButtons.length = 0;

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
      setMenuFocus(1);
    });
    card.addEventListener("focus", () => setMenuFocus(1));
    difficultyButtons.push(card);
    difficultyContainer.appendChild(card);
  });
  selectDifficulty(selectedIndex);
  if (menuFocusIndex === 1) {
    focusCurrentMenuItem();
  }
};

renderModeSettings();
renderDifficultySettings();
timeToggle.addEventListener("change", renderDifficultySettings);

function selectMode(index) {
  selectedModeIndex = index;
  modeButtons.forEach((button, idx) => {
    button.classList.toggle("is-selected", idx === selectedModeIndex);
  });
}

function selectDifficulty(index) {
  selectedIndex = index;
  difficultyButtons.forEach((button, idx) => {
    button.classList.toggle("is-selected", idx === selectedIndex);
  });
}

function createInitialState() {
  const difficultyKey = difficultyOrder[selectedIndex];
  const levelAnimals = pickRandomAnimals([], 5);
  return {
    playerName: nameInput.value.trim(),
    mode: modeOrder[selectedModeIndex],
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

function setMenuFocus(index) {
  menuFocusIndex = Math.max(0, Math.min(index, 5));
}

function focusCurrentMenuItem() {
  if (menuFocusIndex === 0) {
    modeButtons[selectedModeIndex]?.focus();
    return;
  }
  if (menuFocusIndex === 1) {
    difficultyButtons[selectedIndex]?.focus();
    return;
  }
  if (menuFocusIndex === 2) {
    timeToggle.focus();
    return;
  }
  if (menuFocusIndex === 3) {
    nameInput.focus();
    return;
  }
  if (menuFocusIndex === 4) {
    startButton.focus();
    return;
  }
  leaderboardLink?.focus();
}

function moveMenuFocus(delta) {
  setMenuFocus(menuFocusIndex + delta);
  focusCurrentMenuItem();
}

nameInput.addEventListener("focus", () => setMenuFocus(3));
timeToggle.addEventListener("focus", () => setMenuFocus(2));
startButton.addEventListener("focus", () => setMenuFocus(4));
leaderboardLink?.addEventListener("focus", () => setMenuFocus(5));

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveMenuFocus(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveMenuFocus(-1);
    return;
  }
  if (event.key === "ArrowRight" && menuFocusIndex === 0) {
    event.preventDefault();
    selectMode((selectedModeIndex + 1) % modeButtons.length);
    focusCurrentMenuItem();
    return;
  }
  if (event.key === "ArrowLeft" && menuFocusIndex === 0) {
    event.preventDefault();
    selectMode((selectedModeIndex - 1 + modeButtons.length) % modeButtons.length);
    focusCurrentMenuItem();
    return;
  }
  if (event.key === "ArrowRight" && menuFocusIndex === 1) {
    event.preventDefault();
    selectDifficulty((selectedIndex + 1) % difficultyButtons.length);
    focusCurrentMenuItem();
    return;
  }
  if (event.key === "ArrowLeft" && menuFocusIndex === 1) {
    event.preventDefault();
    selectDifficulty(
      (selectedIndex - 1 + difficultyButtons.length) % difficultyButtons.length
    );
    focusCurrentMenuItem();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    if (menuFocusIndex === 0) {
      selectMode((selectedModeIndex + 1) % modeButtons.length);
      focusCurrentMenuItem();
      return;
    }
    if (menuFocusIndex === 1) {
      selectDifficulty((selectedIndex + 1) % difficultyButtons.length);
      focusCurrentMenuItem();
      return;
    }
    if (menuFocusIndex === 2) {
      timeToggle.checked = !timeToggle.checked;
      timeToggle.dispatchEvent(new Event("change"));
      focusCurrentMenuItem();
      return;
    }
    if (menuFocusIndex === 3) {
      setMenuFocus(4);
      focusCurrentMenuItem();
      return;
    }
    if (menuFocusIndex === 4) {
      startGame();
      return;
    }
    leaderboardLink?.click();
  }
});

focusCurrentMenuItem();
