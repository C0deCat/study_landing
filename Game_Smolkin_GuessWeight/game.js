import {
  STORAGE_KEYS,
  difficulties,
  difficultyOrder,
  animals,
  addLeaderboardEntry,
  pickRandomAnimals,
} from "./data.js";

const playerNameEl = document.querySelector("#player-name");
const scoreEl = document.querySelector("#current-score");
const progressEl = document.querySelector("#progress");
const attemptsList = document.querySelector("#attempts-list");
const timerBlock = document.querySelector("#timer-block");
const timerValue = document.querySelector("#timer-value");
const cardStage = document.querySelector("#card-stage");
const hintText = document.querySelector("#hint-text");
const weightInput = document.querySelector("#weight-input");
const submitButton = document.querySelector("#submit-weight");
const giveUpButton = document.querySelector("#give-up");
const overlay = document.querySelector("#overlay");
const modalTitle = document.querySelector("#modal-title");
const modalMessage = document.querySelector("#modal-message");
const modalActions = document.querySelector("#modal-actions");
const levelBadge = document.querySelector("#level-badge");

const animalsById = new Map(animals.map((animal) => [animal.id, animal]));

let state = loadState();
let timerId = null;
let timeRemaining = null;

if (!state) {
  window.location.href = "menu.html";
}

playerNameEl.textContent = state.playerName;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.state);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(state));
}

function getDifficultySettings() {
  return difficulties[state.difficulty];
}

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function updateHeader() {
  scoreEl.textContent = state.baseScore;
  progressEl.textContent = `${state.currentIndex + 1} / ${
    state.levelAnimals.length
  }`;
  levelBadge.textContent = `Уровень: ${getDifficultySettings().label}`;
  renderAttempts();
  timerBlock.style.display = state.timeMode ? "block" : "none";
}

function renderAttempts() {
  attemptsList.innerHTML = "";
  const total = getDifficultySettings().attempts;
  for (let i = 0; i < total; i += 1) {
    const dot = document.createElement("span");
    dot.className = "attempt-dot";
    if (i < state.attemptsLeft) {
      dot.classList.add("is-remaining");
    }
    attemptsList.appendChild(dot);
  }
}

function createAnimalCard(animal) {
  const card = document.createElement("div");
  card.className = "animal-card";
  const title = document.createElement("h2");
  title.textContent = animal.name;
  const placeholder = document.createElement("div");
  placeholder.className = "animal-placeholder";
  placeholder.style.background = animal.color;
  placeholder.textContent = "Фото";
  card.append(title, placeholder);
  return card;
}

function swapCard(animal) {
  const existing = cardStage.querySelector(".animal-card");
  if (existing) {
    existing.classList.remove("enter", "enter-active");

    existing.classList.add("exit");
    existing.addEventListener(
      "transitionend",
      () => {
        existing.remove();
      },
      { once: true }
    );
  }
  const newCard = createAnimalCard(animal);
  newCard.classList.add("enter");
  cardStage.appendChild(newCard);
  requestAnimationFrame(() => {
    newCard.classList.add("enter-active");
  });
}

function startTimer() {
  clearTimer();
  if (!state.timeMode) {
    timerValue.textContent = "--:--";
    return;
  }
  timeRemaining = getDifficultySettings().timeLimit;
  timerValue.textContent = formatTime(timeRemaining);
  timerId = setInterval(() => {
    timeRemaining -= 1;
    if (timeRemaining <= 0) {
      clearTimer();
      handleTimeout();
      return;
    }
    timerValue.textContent = formatTime(timeRemaining);
  }, 1000);
}

function clearTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function handleTimeout() {
  state.attemptsLeft -= 1;
  state.failedAttemptsCurrent += 1;
  hintText.textContent = "Время вышло. Попытка потрачена.";
  if (state.attemptsLeft <= 0) {
    handleLoss();
    return;
  }
  updateHeader();
  saveState();
  startTimer();
}

function currentAnimal() {
  return animalsById.get(state.levelAnimals[state.currentIndex]);
}

function handleCorrectGuess(animal) {
  const pointsForAnimal = Math.max(0, 10 - state.failedAttemptsCurrent * 2);
  state.baseScore += pointsForAnimal;
  state.completedAnimals += 1;
  state.currentIndex += 1;
  if (state.currentIndex >= state.levelAnimals.length) {
    handleLevelComplete();
    return;
  }
  state.failedAttemptsCurrent = 0;
  state.attemptsLeft = getDifficultySettings().attempts;
  hintText.textContent = `Верно! Вес ${animal.name} ≈ ${animal.weight} кг.`;
  updateHeader();
  saveState();
  swapCard(currentAnimal());
  startTimer();
}

function handleIncorrectGuess(isHigh) {
  state.attemptsLeft -= 1;
  state.failedAttemptsCurrent += 1;
  if (state.attemptsLeft <= 0) {
    hintText.textContent = "Попытки закончились.";
    handleLoss();
    return;
  }
  hintText.textContent = isHigh
    ? "Слишком много! Попробуйте меньше."
    : "Слишком мало! Попробуйте больше.";
  updateHeader();
  saveState();
  startTimer();
}

function handleLevelComplete() {
  clearTimer();
  updateHeader();
  const canContinue = state.difficulty !== "hard";
  const finalScore = computeFinalScore();
  showModal({
    title: "Уровень пройден!",
    message: `Поздравляем! Базовые очки: ${state.baseScore}. Итог с множителями: ${finalScore}.`,
    canContinue,
    isWin: true,
  });
}

function handleLoss() {
  clearTimer();
  updateHeader();
  const finalScore = computeFinalScore();
  showModal({
    title: "Игра окончена",
    message: `Вы не угадали вес животного. Итоговые очки: ${finalScore}.`,
    canContinue: false,
    isWin: false,
  });
}

function computeFinalScore() {
  const highestMultiplier =
    difficulties[state.highestDifficulty]?.multiplier || 1;
  const timedMultiplier = state.timeMode ? 2 : 1;
  return state.baseScore * highestMultiplier * timedMultiplier;
}

function showModal({ title, message, canContinue, isWin }) {
  overlay.classList.remove("hidden");
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalActions.innerHTML = "";

  if (canContinue) {
    const continueButton = document.createElement("button");
    continueButton.className = "primary";
    continueButton.textContent = "Продолжить уровень";
    continueButton.addEventListener("click", () => {
      overlay.classList.add("hidden");
      moveToNextLevel();
    });
    modalActions.appendChild(continueButton);
  }

  const saveButton = document.createElement("button");
  saveButton.className = canContinue ? "secondary" : "primary";
  saveButton.textContent = "Сохранить результат";
  saveButton.addEventListener("click", () => {
    saveScore();
    window.location.href = "leaderboard.html";
  });
  modalActions.appendChild(saveButton);

  const exitButton = document.createElement("button");
  exitButton.className = "secondary";
  exitButton.textContent = isWin ? "В меню" : "Начать заново";
  exitButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.state);
    window.location.href = "menu.html";
  });
  modalActions.appendChild(exitButton);

  const focusTarget = modalActions.querySelector("button");
  if (focusTarget) {
    focusTarget.focus();
  }
}

function moveToNextLevel() {
  const currentIndex = difficultyOrder.indexOf(state.difficulty);
  const nextDifficulty = difficultyOrder[currentIndex + 1];
  if (!nextDifficulty) {
    return;
  }
  state.difficulty = nextDifficulty;
  state.highestDifficulty = nextDifficulty;
  state.levelAnimals = pickRandomAnimals(state.usedAnimals, 5);
  state.usedAnimals = [...state.usedAnimals, ...state.levelAnimals];
  state.baseScore = 0;
  state.currentIndex = 0;
  state.completedAnimals = 0;
  state.failedAttemptsCurrent = 0;
  state.attemptsLeft = difficulties[nextDifficulty].attempts;
  hintText.textContent = "Новый уровень!";
  updateHeader();
  saveState();
  swapCard(currentAnimal());
  startTimer();
}

function saveScore() {
  const highestLabel = difficulties[state.highestDifficulty]?.label || "";
  addLeaderboardEntry({
    name: state.playerName,
    score: computeFinalScore(),
    difficulty: highestLabel,
    timed: state.timeMode,
  });
}

function handleSubmit() {
  const value = Number(weightInput.value);
  if (!value || value <= 0) {
    hintText.textContent = "Введите корректное число.";
    return;
  }
  const animal = currentAnimal();
  if (!animal) {
    return;
  }
  clearTimer();
  weightInput.value = "";
  const tolerance = animal.weight * 0.1;
  const isCorrect = Math.abs(animal.weight - value) <= tolerance;
  if (isCorrect) {
    handleCorrectGuess(animal);
  } else {
    handleIncorrectGuess(value > animal.weight);
  }
}

function setupInputHandlers() {
  submitButton.addEventListener("click", handleSubmit);
  giveUpButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.state);
    window.location.href = "menu.html";
  });

  window.addEventListener("keydown", (event) => {
    if (!overlay.classList.contains("hidden")) {
      return;
    }
    if (/^\d$/.test(event.key)) {
      if (document.activeElement !== weightInput) {
        event.preventDefault();
        weightInput.focus();
        weightInput.value += event.key;
      }
      return;
    }
    if (event.key === "Enter" && document.activeElement === weightInput) {
      event.preventDefault();
      handleSubmit();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (overlay.classList.contains("hidden")) {
      return;
    }
    if (event.key === "Enter") {
      const primaryButton = modalActions.querySelector("button");
      if (primaryButton) {
        primaryButton.click();
      }
    }
  });
}

function initGame() {
  updateHeader();
  swapCard(currentAnimal());
  setupInputHandlers();
  startTimer();
}

initGame();
