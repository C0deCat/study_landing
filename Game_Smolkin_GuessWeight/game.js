import {
  STORAGE_KEYS,
  difficulties,
  difficultyOrder,
  animals,
  modes,
  weights,
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
const scaleStage = document.querySelector("#scale-stage");
const scaleField = document.querySelector("#scale-field");
const leftPlatform = document.querySelector("#left-platform");
const rightPlatform = document.querySelector("#right-platform");
const scaleAnimal = document.querySelector("#scale-animal");
const scaleArrow = document.querySelector("#scale-arrow");
const weightsContainer = document.querySelector("#weights-container");
const weightDropZone = document.querySelector("#weight-drop-zone");
const hintText = document.querySelector("#hint-text");
const weightLabel = document.querySelector("#weight-label");
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
let placedWeights = [];
let dragState = null;

if (!state) {
  window.location.href = "menu.html";
}

if (state && typeof state.modeIndex !== "number") {
  const defaultModeIndex = modes.findIndex(
    (mode) => mode.modeName === "Ввод веса"
  );
  state.modeIndex = defaultModeIndex >= 0 ? defaultModeIndex : 0;
  saveState();
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

function getModeSettings() {
  return modes[state.modeIndex] || modes[0];
}

function isWeightsMode() {
  return getModeSettings().modeName === "Подбор гирьками";
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

function adjustStageHeight(card) {
  if (!card) {
    return;
  }
  const height = card.offsetHeight;
  if (height) {
    cardStage.style.height = `${height}px`;
  }
}

function createAnimalCard(animal) {
  const card = document.createElement("div");
  card.className = "animal-card";

  const title = document.createElement("h2");
  title.textContent = animal.name;

  const media = document.createElement("div");
  media.className = "animal-media";

  const image = document.createElement("img");
  image.className = "animal-image";
  image.src = `./assets/${animal.id}.jpg`;
  image.alt = `Фото: ${animal.name}`;

  const placeholder = document.createElement("div");
  placeholder.className = "animal-placeholder";
  placeholder.style.background = animal.color;
  placeholder.textContent = "Фото";

  image.addEventListener("load", () => {
    placeholder.classList.add("is-hidden");
    adjustStageHeight(card);
  });
  image.addEventListener("error", () => {
    image.remove();
    placeholder.textContent = "Фото недоступно";
    adjustStageHeight(card);
  });

  media.append(image, placeholder);
  card.append(title, media);
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
    adjustStageHeight(newCard);
  });
}

const PLATFORM_LIMIT = 50;
const DROP_ZONE_HEIGHT = 300;

function updateDropZonePosition() {
  const platformRect = rightPlatform.getBoundingClientRect();
  const fieldRect = scaleField.getBoundingClientRect();
  weightDropZone.style.width = `${platformRect.width}px`;
  weightDropZone.style.height = `${DROP_ZONE_HEIGHT}px`;
  weightDropZone.style.left = `${platformRect.left - fieldRect.left}px`;
  weightDropZone.style.top = `${
    platformRect.top - fieldRect.top - DROP_ZONE_HEIGHT
  }px`;
}

function updateScaleBalance() {
  const animal = currentAnimal();
  if (!animal) {
    return;
  }
  const allWeights = placedWeights.reduce(
    (sum, item) => sum + item.mass,
    0
  );
  const total = animal.weight + allWeights;
  const leftPercent = total
    ? PLATFORM_LIMIT * (allWeights / total)
    : 0;
  const rightPercent = total
    ? PLATFORM_LIMIT * (animal.weight / total)
    : 0;
  leftPlatform.style.bottom = `${leftPercent}%`;
  rightPlatform.style.bottom = `${rightPercent}%`;
  const deg = total ? 90 * ((allWeights - animal.weight) / total) : 0;
  scaleArrow.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
}

function layoutPlacedWeights() {
  const platformRect = rightPlatform.getBoundingClientRect();
  const fieldRect = scaleField.getBoundingClientRect();
  placedWeights.forEach((item, index) => {
    const weightEl = item.element;
    const weightWidth = weightEl.offsetWidth;
    const weightHeight = weightEl.offsetHeight;
    const baseLeft =
      platformRect.left -
      fieldRect.left +
      (platformRect.width - weightWidth) / 2;
    const baseTop = platformRect.top - fieldRect.top - weightHeight;
    const offset = index * 10;
    weightEl.style.left = `${baseLeft + offset}px`;
    weightEl.style.top = `${baseTop - offset}px`;
  });
}

function resetWeightsStage() {
  placedWeights = [];
  weightsContainer.innerHTML = "";
  const weightsSorted = [...weights].sort((a, b) => b.mass - a.mass);
  let currentX = 0;

  weightsSorted.forEach((weight) => {
    const correctedBasis = Math.min(weight.basisSize, window.innerWidth * 0.1);
    const headWidth = correctedBasis * 0.5;
    const headHeight = correctedBasis * 0.25;
    for (let index = 0; index < weight.amount; index += 1) {
      const weightEl = document.createElement("div");
      weightEl.className = "weight-item";
      weightEl.textContent = weight.mass;
      weightEl.dataset.mass = String(weight.mass);
      weightEl.style.width = `${correctedBasis}px`;
      weightEl.style.height = `${correctedBasis * 1.5}px`;
      weightEl.style.setProperty("--weight-head-width", `${headWidth}px`);
      weightEl.style.setProperty("--weight-head-height", `${headHeight}px`);

      const offset = index * 0.2 * weight.basisSize;
      const left = currentX + offset;
      const top = offset;
      weightEl.style.left = `${left}px`;
      weightEl.style.top = `${top}px`;
      weightEl.dataset.originLeft = `${left}`;
      weightEl.dataset.originTop = `${top}`;
      weightEl.addEventListener("mousedown", handleWeightMouseDown);
      weightsContainer.appendChild(weightEl);
    }

    const columnWidth =
      correctedBasis + (weight.amount - 1) * 0.2 * weight.basisSize;
    currentX += columnWidth + 8;
  });

  updateScaleBalance();
}

function handleWeightMouseDown(event) {
  if (!isWeightsMode() || overlay.classList.contains("hidden") === false) {
    return;
  }
  const weightEl = event.currentTarget;
  event.preventDefault();
  const fieldRect = scaleField.getBoundingClientRect();
  const rect = weightEl.getBoundingClientRect();

  dragState = {
    element: weightEl,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };

  weightEl.classList.add("dragging");
  scaleField.appendChild(weightEl);
  weightEl.style.left = `${rect.left - fieldRect.left}px`;
  weightEl.style.top = `${rect.top - fieldRect.top}px`;

  updateDropZonePosition();
  weightDropZone.classList.add("is-active");
  document.addEventListener("mousemove", handleWeightMouseMove);
  document.addEventListener("mouseup", handleWeightMouseUp);
}

function handleWeightMouseMove(event) {
  if (!dragState) {
    return;
  }
  const fieldRect = scaleField.getBoundingClientRect();
  const left = event.clientX - fieldRect.left - dragState.offsetX;
  const top = event.clientY - fieldRect.top - dragState.offsetY;
  dragState.element.style.left = `${left}px`;
  dragState.element.style.top = `${top}px`;
}

function handleWeightMouseUp(event) {
  if (!dragState) {
    return;
  }
  const weightEl = dragState.element;
  weightEl.classList.remove("dragging");

  weightDropZone.classList.remove("is-active");
  document.removeEventListener("mousemove", handleWeightMouseMove);
  document.removeEventListener("mouseup", handleWeightMouseUp);

  const zoneRect = weightDropZone.getBoundingClientRect();
  const isInsideZone =
    event.clientX >= zoneRect.left &&
    event.clientX <= zoneRect.right &&
    event.clientY >= zoneRect.top &&
    event.clientY <= zoneRect.bottom;

  const existingIndex = placedWeights.findIndex(
    (item) => item.element === weightEl
  );

  if (isInsideZone) {
    if (existingIndex === -1) {
      placedWeights.push({
        element: weightEl,
        mass: Number(weightEl.dataset.mass) || 0,
      });
    }
    layoutPlacedWeights();
  } else {
    if (existingIndex !== -1) {
      placedWeights.splice(existingIndex, 1);
    }
    weightsContainer.appendChild(weightEl);
    const originLeft = Number(weightEl.dataset.originLeft) || 0;
    const originTop = Number(weightEl.dataset.originTop) || 0;
    weightEl.style.left = `${originLeft}px`;
    weightEl.style.top = `${originTop}px`;
  }

  updateScaleBalance();
  dragState = null;
}

function renderScaleAnimal(animal) {
  scaleAnimal.src = `./assets/${animal.id}.jpg`;
  scaleAnimal.alt = `Фото: ${animal.name}`;
}

function renderGameStage() {
  if (isWeightsMode()) {
    cardStage.classList.add("hidden");
    scaleStage.classList.remove("hidden");
    weightInput.classList.add("hidden");
    weightInput.disabled = true;
    weightLabel.textContent = "Подберите гирьки и нажмите «Проверить вес»";
    const animal = currentAnimal();
    if (animal) {
      renderScaleAnimal(animal);
    }
    resetWeightsStage();
  } else {
    cardStage.classList.remove("hidden");
    scaleStage.classList.add("hidden");
    weightInput.classList.remove("hidden");
    weightInput.disabled = false;
    weightLabel.textContent = "Введите вес животного (кг)";
    swapCard(currentAnimal());
  }
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
  renderGameStage();
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
  const modeMultiplier = getModeSettings().modeModifier || 1;
  return state.baseScore * highestMultiplier * timedMultiplier * modeMultiplier;
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
  renderGameStage();
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
  const animal = currentAnimal();
  if (!animal) {
    return;
  }
  let value = 0;
  if (isWeightsMode()) {
    value = placedWeights.reduce((sum, item) => sum + item.mass, 0);
  } else {
    value = Number(weightInput.value);
    if (!value || value <= 0) {
      hintText.textContent = "Введите корректное число.";
      return;
    }
    weightInput.value = "";
  }
  clearTimer();
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
    if (!isWeightsMode() && /^\d$/.test(event.key)) {
      if (document.activeElement !== weightInput) {
        event.preventDefault();
        weightInput.focus();
        weightInput.value += event.key;
      }
      return;
    }
    if (
      event.key === "Enter" &&
      (!isWeightsMode() && document.activeElement === weightInput)
    ) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === "Enter" && isWeightsMode()) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === "Enter" && !overlay.classList.contains("hidden")) {
      const primaryButton = modalActions.querySelector("button");
      if (primaryButton) {
        primaryButton.click();
      }
    }
  });
}

function initGame() {
  updateHeader();
  renderGameStage();
  setupInputHandlers();
  startTimer();
  window.addEventListener("resize", () => {
    if (isWeightsMode()) {
      updateDropZonePosition();
      layoutPlacedWeights();
      updateScaleBalance();
    }
  });
}

initGame();
