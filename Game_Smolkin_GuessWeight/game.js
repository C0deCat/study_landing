import {
  STORAGE_KEYS,
  difficulties,
  difficultyOrder,
  modes,
  weights,
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
const balanceStage = document.querySelector("#balance-stage");
const weightsRack = document.querySelector("#weights-rack");
const dropHighlight = document.querySelector("#drop-highlight");
const leftStack = document.querySelector("#left-stack");
const rightStack = document.querySelector("#right-stack");
const balanceArrow = document.querySelector("#balance-arrow");
const animalOnScale = document.querySelector("#animal-on-scale");
const modeDescription = document.querySelector("#mode-description");
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
let dragState = null;
let weightElements = [];
const weightOrigins = new Map();

if (!state) {
  window.location.href = "menu.html";
}

if (state && !state.mode) {
  state.mode = "input";
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

function isWeightsMode() {
  return state.mode === "weights";
}

function getModeSettings() {
  return modes.find((mode) => mode.id === state.mode);
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

function updateModeLayout() {
  const weightsMode = isWeightsMode();
  document.body.classList.toggle("mode-weights", weightsMode);
  balanceStage.classList.toggle("is-hidden", !weightsMode);
  weightInput.disabled = weightsMode;

  if (weightsMode) {
    modeDescription.textContent =
      "Перетащите гири на правую платформу и нажмите «Проверить вес».";
  } else {
    modeDescription.textContent =
      "Введите предполагаемый вес животного и нажмите «Проверить вес».";
  }
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

function getCorrectedBasis(basisSize) {
  return Math.min(basisSize, window.innerWidth * 0.1);
}

function getAllWeights() {
  return weightElements.reduce(
    (sum, element) =>
      sum + (element.dataset.onScale === "true" ? Number(element.dataset.mass) : 0),
    0
  );
}

function updateBalancePositions() {
  if (!isWeightsMode()) {
    return;
  }
  const animal = currentAnimal();
  if (!animal) {
    return;
  }
  const animalWeight = animal.weight;
  const allWeights = getAllWeights();
  const totalWeight = animalWeight + allWeights;
  const L = 50;
  let leftOffset = 0;
  let rightOffset = 0;
  let deg = 0;

  if (totalWeight > 0) {
    leftOffset = L * (allWeights / totalWeight);
    rightOffset = L * (animalWeight / totalWeight);
    deg = 90 * ((allWeights - animalWeight) / totalWeight);
  }

  leftStack.style.setProperty("--left-offset", `${leftOffset}%`);
  rightStack.style.setProperty("--right-offset", `${rightOffset}%`);
  balanceArrow.style.setProperty("--arrow-rotation", `${deg}deg`);
}

function updatePlacedWeightPositions() {
  const placed = weightElements.filter(
    (element) => element.dataset.onScale === "true"
  );
  const platformHeight =
    parseFloat(
      getComputedStyle(balanceStage).getPropertyValue("--platform-height")
    ) || 18;
  const platformWidth = rightStack.getBoundingClientRect().width;
  placed.forEach((element, index) => {
    const elementWidth = element.getBoundingClientRect().width;
    const offset = index * 14;
    const left = Math.min(offset, platformWidth - elementWidth - 4);
    element.style.left = `${Math.max(0, left)}px`;
    element.style.bottom = `${platformHeight + 8 + index * 6}px`;
  });
}

function resetWeightToOrigin(weightElement) {
  const origin = weightOrigins.get(weightElement);
  if (!origin) {
    return;
  }
  origin.parent.appendChild(weightElement);
  weightElement.dataset.onScale = "false";
  weightElement.classList.remove("is-dragging");
  weightElement.style.position = "absolute";
  weightElement.style.left = origin.left;
  weightElement.style.bottom = origin.bottom;
  weightElement.style.top = "auto";
  weightElement.style.zIndex = "";
}

function placeWeightOnScale(weightElement) {
  rightStack.appendChild(weightElement);
  weightElement.dataset.onScale = "true";
  weightElement.classList.remove("is-dragging");
  weightElement.style.position = "absolute";
  weightElement.style.top = "auto";
  weightElement.style.zIndex = "2";
  updatePlacedWeightPositions();
  updateBalancePositions();
}

function handleWeightMouseMove(event) {
  if (!dragState) {
    return;
  }
  dragState.element.style.left = `${event.clientX - dragState.offsetX}px`;
  dragState.element.style.top = `${event.clientY - dragState.offsetY}px`;
}

function handleWeightMouseUp(event) {
  if (!dragState) {
    return;
  }
  document.removeEventListener("mousemove", handleWeightMouseMove);
  document.removeEventListener("mouseup", handleWeightMouseUp);
  dropHighlight.classList.remove("is-active");

  const dropRect = dropHighlight.getBoundingClientRect();
  const isInside =
    event.clientX >= dropRect.left &&
    event.clientX <= dropRect.right &&
    event.clientY >= dropRect.top &&
    event.clientY <= dropRect.bottom;

  if (isInside) {
    placeWeightOnScale(dragState.element);
  } else {
    resetWeightToOrigin(dragState.element);
    updateBalancePositions();
  }

  dragState = null;
}

function handleWeightMouseDown(event) {
  if (!isWeightsMode() || event.button !== 0) {
    return;
  }
  const weightElement = event.currentTarget;
  event.preventDefault();
  const rect = weightElement.getBoundingClientRect();
  dragState = {
    element: weightElement,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };

  weightElement.classList.add("is-dragging");
  weightElement.style.position = "fixed";
  weightElement.style.left = `${rect.left}px`;
  weightElement.style.top = `${rect.top}px`;
  weightElement.style.bottom = "auto";
  weightElement.style.zIndex = "1000";
  dropHighlight.classList.add("is-active");

  document.addEventListener("mousemove", handleWeightMouseMove);
  document.addEventListener("mouseup", handleWeightMouseUp);
}

function renderWeightsRack() {
  weightsRack.innerHTML = "";
  weightElements = [];
  weightOrigins.clear();

  const sortedWeights = [...weights].sort((a, b) => b.mass - a.mass);

  sortedWeights.forEach((weight, weightIndex) => {
    const column = document.createElement("div");
    column.className = "weight-column";

    const correctedBasis = getCorrectedBasis(weight.basisSize);
    const width = correctedBasis;
    const height = correctedBasis * 1.5;
    const headWidth = correctedBasis * 0.5;
    const headHeight = correctedBasis * 0.25;
    const shift = 0.2 * weight.basisSize;
    const columnWidth = width + (weight.amount - 1) * shift;
    const columnHeight = height + (weight.amount - 1) * shift + headHeight;

    column.style.width = `${columnWidth}px`;
    column.style.height = `${columnHeight}px`;

    for (let index = 0; index < weight.amount; index += 1) {
      const weightBlock = document.createElement("div");
      weightBlock.className = "weight-block";
      weightBlock.textContent = weight.mass;
      weightBlock.style.setProperty("--weight-width", `${width}px`);
      weightBlock.style.setProperty("--weight-height", `${height}px`);
      weightBlock.style.setProperty("--weight-head-width", `${headWidth}px`);
      weightBlock.style.setProperty("--weight-head-height", `${headHeight}px`);
      const hue = 210 - weightIndex * 12;
      weightBlock.style.setProperty(
        "--weight-color",
        `hsl(${hue} 45% 45%)`
      );

      const offset = index * shift;
      weightBlock.style.left = `${offset}px`;
      weightBlock.style.bottom = `${offset}px`;
      weightBlock.dataset.mass = weight.mass;
      weightBlock.dataset.onScale = "false";
      weightBlock.addEventListener("mousedown", handleWeightMouseDown);

      weightElements.push(weightBlock);
      weightOrigins.set(weightBlock, {
        parent: column,
        left: weightBlock.style.left,
        bottom: weightBlock.style.bottom,
      });
      column.appendChild(weightBlock);
    }

    weightsRack.appendChild(column);
  });
}

function updateWeightModeAnimal(animal) {
  animalOnScale.src = `./assets/${animal.id}.jpg`;
  animalOnScale.alt = `Фото: ${animal.name}`;
}

function resetWeightsToRack() {
  weightElements.forEach((weightElement) => resetWeightToOrigin(weightElement));
  updatePlacedWeightPositions();
  updateBalancePositions();
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
  if (isWeightsMode()) {
    resetWeightsToRack();
    updateWeightModeAnimal(currentAnimal());
  } else {
    swapCard(currentAnimal());
  }
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
  const modeMultiplier = getModeSettings()?.modeModifier || 1;
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
  if (isWeightsMode()) {
    resetWeightsToRack();
    updateWeightModeAnimal(currentAnimal());
  } else {
    swapCard(currentAnimal());
  }
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

function getGuessValue() {
  if (isWeightsMode()) {
    const allWeights = getAllWeights();
    if (allWeights <= 0) {
      hintText.textContent = "Добавьте гири на платформу справа.";
      return null;
    }
    return allWeights;
  }
  const value = Number(weightInput.value);
  if (!value || value <= 0) {
    hintText.textContent = "Введите корректное число.";
    return null;
  }
  return value;
}

function handleSubmit() {
  const value = getGuessValue();
  if (value === null) {
    return;
  }
  const animal = currentAnimal();
  if (!animal) {
    return;
  }
  clearTimer();
  if (!isWeightsMode()) {
    weightInput.value = "";
  }
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
    if (/^\d$/.test(event.key) && !isWeightsMode()) {
      if (document.activeElement !== weightInput) {
        event.preventDefault();
        weightInput.focus();
        weightInput.value += event.key;
      }
      return;
    }
    if (event.key === "Enter" && isWeightsMode()) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === "Enter" && document.activeElement === weightInput) {
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
  updateModeLayout();
  updateHeader();
  if (isWeightsMode()) {
    renderWeightsRack();
    updateWeightModeAnimal(currentAnimal());
    resetWeightsToRack();
  } else {
    swapCard(currentAnimal());
  }
  setupInputHandlers();
  startTimer();
}

initGame();
