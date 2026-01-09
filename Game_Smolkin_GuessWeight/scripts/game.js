import {
  ANIMALS,
  DIFFICULTY_LEVELS,
  calculateFinalScore,
  clearState,
  formatTime,
  getDifficultyLabel,
  loadSettings,
  loadState,
  saveLeaderboard,
  saveState,
  loadLeaderboard,
  ensureLeaderboard,
} from "./game-data.js";

const playerLabel = document.querySelector("#playerLabel");
const levelLabel = document.querySelector("#levelLabel");
const progressLabel = document.querySelector("#progressLabel");
const attemptsLabel = document.querySelector("#attemptsLabel");
const timerLabel = document.querySelector("#timerLabel");
const timerBlock = document.querySelector("#timerBlock");
const scoreLabel = document.querySelector("#scoreLabel");
const animalStage = document.querySelector("#animalStage");
const hintText = document.querySelector("#hintText");
const guessForm = document.querySelector("#guessForm");
const weightInput = document.querySelector("#weightInput");
const exitButton = document.querySelector("#exitButton");
const modal = document.querySelector("#resultModal");
const modalTitle = document.querySelector("#modalTitle");
const modalMessage = document.querySelector("#modalMessage");
const modalActions = document.querySelector("#modalActions");

let state = loadState();
const settings = loadSettings();

ensureLeaderboard();

if (!settings || !settings.playerName) {
  window.location.href = "index.html";
}

const animalsById = new Map(ANIMALS.map((animal) => [animal.id, animal]));
let timerId = null;
let timeRemaining = 0;

function shuffle(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function pickAnimals(count, usedIds) {
  const available = ANIMALS.filter((animal) => !usedIds.includes(animal.id));
  return shuffle(available).slice(0, count).map((animal) => animal.id);
}

function createState() {
  const difficultyIndex = settings.difficultyIndex ?? 0;
  const usedAnimalIds = [];
  const levelAnimals = pickAnimals(5, usedAnimalIds);
  usedAnimalIds.push(...levelAnimals);
  return {
    playerName: settings.playerName,
    timed: Boolean(settings.timed),
    currentLevelIndex: difficultyIndex,
    highestLevelIndex: difficultyIndex,
    usedAnimalIds,
    levelAnimals,
    currentAnimalIndex: 0,
    attemptsLeft: DIFFICULTY_LEVELS[difficultyIndex].attempts,
    failedAttemptsForAnimal: 0,
    totalBasePoints: 0,
  };
}

if (!state) {
  state = createState();
  saveState(state);
}

function updateStatus() {
  playerLabel.textContent = state.playerName;
  levelLabel.textContent = getDifficultyLabel(state.currentLevelIndex);
  progressLabel.textContent = `${state.currentAnimalIndex + 1} / 5`;
  attemptsLabel.textContent = String(state.attemptsLeft);
  scoreLabel.textContent = String(state.totalBasePoints);
  if (state.timed) {
    timerBlock.hidden = false;
    timerLabel.textContent = formatTime(timeRemaining);
  } else {
    timerBlock.hidden = true;
  }
}

function createAnimalCard(animal) {
  const card = document.createElement("article");
  card.className = "animal-card";
  card.innerHTML = `
    <div class="animal-placeholder" style="background:${animal.color}">
      ${animal.name}
    </div>
    <div class="animal-info">
      <h2>${animal.name}</h2>
      <p>Угадайте вес животного в килограммах.</p>
    </div>
  `;
  return card;
}

function renderAnimal() {
  const animalId = state.levelAnimals[state.currentAnimalIndex];
  const animal = animalsById.get(animalId);
  const newCard = createAnimalCard(animal);
  const previousCard = animalStage.querySelector(".animal-card");

  newCard.classList.add("enter");
  animalStage.appendChild(newCard);

  if (previousCard) {
    previousCard.classList.add("exit");
    previousCard.addEventListener(
      "animationend",
      () => previousCard.remove(),
      { once: true }
    );
  }
}

function startTimer() {
  if (!state.timed) {
    return;
  }
  clearInterval(timerId);
  timeRemaining = DIFFICULTY_LEVELS[state.currentLevelIndex].timeLimit;
  timerLabel.textContent = formatTime(timeRemaining);
  timerId = setInterval(() => {
    timeRemaining -= 1;
    timerLabel.textContent = formatTime(timeRemaining);
    if (timeRemaining <= 0) {
      clearInterval(timerId);
      handleFailedAttempt("Время вышло! Попробуйте снова.");
    }
  }, 1000);
}

function handleFailedAttempt(message) {
  state.attemptsLeft -= 1;
  state.failedAttemptsForAnimal += 1;
  hintText.textContent = message;
  if (state.attemptsLeft <= 0) {
    showLoseModal();
  } else {
    startTimer();
  }
  saveState(state);
  updateStatus();
}

function handleCorrectGuess() {
  const gained = Math.max(0, 10 - state.failedAttemptsForAnimal * 2);
  state.totalBasePoints += gained;
  hintText.textContent = `Верно! +${gained} очков.`;
  if (state.currentAnimalIndex < state.levelAnimals.length - 1) {
    state.currentAnimalIndex += 1;
    state.attemptsLeft =
      DIFFICULTY_LEVELS[state.currentLevelIndex].attempts;
    state.failedAttemptsForAnimal = 0;
    saveState(state);
    updateStatus();
    renderAnimal();
    startTimer();
    weightInput.value = "";
    weightInput.focus();
  } else {
    showWinModal();
  }
}

function showModal(title, message, actions) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalActions.innerHTML = "";
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.variant ?? "ghost";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    modalActions.appendChild(button);
  });
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  clearInterval(timerId);
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function saveResult() {
  const leaderboard = loadLeaderboard();
  const finalScore = calculateFinalScore(state);
  leaderboard.push({ name: state.playerName, score: finalScore });
  leaderboard.sort((a, b) => b.score - a.score);
  saveLeaderboard(leaderboard.slice(0, 20));
  clearState();
}

function showWinModal() {
  const finalScore = calculateFinalScore(state);
  const hasNextLevel = state.currentLevelIndex < DIFFICULTY_LEVELS.length - 1;
  showModal(
    "Уровень пройден!",
    `Ваши очки: ${finalScore}. Хотите продолжить?`,
    [
      ...(hasNextLevel
        ? [
            {
              label: "Продолжить",
              variant: "primary",
              onClick: () => {
                closeModal();
                advanceLevel();
              },
            },
          ]
        : []),
      {
        label: "Сохранить результат",
        variant: "primary",
        onClick: () => {
          saveResult();
          window.location.href = "leaderboard.html";
        },
      },
      {
        label: "В меню",
        onClick: () => {
          clearState();
          window.location.href = "index.html";
        },
      },
    ]
  );
}

function showLoseModal() {
  const finalScore = calculateFinalScore(state);
  showModal(
    "Попытки закончились",
    `Игра завершена. Ваши очки: ${finalScore}.`,
    [
      {
        label: "Начать заново",
        variant: "primary",
        onClick: () => {
          clearState();
          window.location.href = "index.html";
        },
      },
      {
        label: "Сохранить и выйти",
        variant: "primary",
        onClick: () => {
          saveResult();
          window.location.href = "leaderboard.html";
        },
      },
      {
        label: "В меню",
        onClick: () => {
          clearState();
          window.location.href = "index.html";
        },
      },
    ]
  );
}

function advanceLevel() {
  state.currentLevelIndex += 1;
  state.highestLevelIndex = Math.max(
    state.highestLevelIndex,
    state.currentLevelIndex
  );
  state.levelAnimals = pickAnimals(5, state.usedAnimalIds);
  state.usedAnimalIds.push(...state.levelAnimals);
  state.currentAnimalIndex = 0;
  state.attemptsLeft = DIFFICULTY_LEVELS[state.currentLevelIndex].attempts;
  state.failedAttemptsForAnimal = 0;
  saveState(state);
  updateStatus();
  renderAnimal();
  startTimer();
  weightInput.value = "";
  weightInput.focus();
}

function handleSubmit(event) {
  event.preventDefault();
  const rawValue = weightInput.value.trim().replace(",", ".");
  const guess = Number(rawValue);
  if (!Number.isFinite(guess) || guess <= 0) {
    hintText.textContent = "Введите корректное число.";
    return;
  }

  const animalId = state.levelAnimals[state.currentAnimalIndex];
  const animal = animalsById.get(animalId);
  const min = animal.weight * 0.9;
  const max = animal.weight * 1.1;

  if (guess >= min && guess <= max) {
    handleCorrectGuess();
    return;
  }

  if (guess < min) {
    handleFailedAttempt("Слишком мало. Попробуйте больше.");
  } else {
    handleFailedAttempt("Слишком много. Попробуйте меньше.");
  }
}

function init() {
  updateStatus();
  renderAnimal();
  startTimer();
  weightInput.focus();
}

guessForm.addEventListener("submit", handleSubmit);
exitButton.addEventListener("click", () => {
  clearState();
  window.location.href = "index.html";
});

document.addEventListener("keydown", (event) => {
  if (modal.classList.contains("open") && event.key === "Enter") {
    const primary = modalActions.querySelector(".primary");
    if (primary) {
      primary.click();
    }
  }
});

init();
