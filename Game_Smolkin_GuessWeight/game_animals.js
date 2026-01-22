import {
  STORAGE_KEYS,
  difficulties,
  difficultyOrder,
  modes,
  animals,
  addLeaderboardEntry,
  buildAnimalComparisonLevel,
  pickRandomAnimals,
} from "./data.js";
import { createGameCore } from "./games.js";

const playerNameEl = document.querySelector("#player-name");
const scoreEl = document.querySelector("#current-score");
const progressEl = document.querySelector("#progress");
const attemptsList = document.querySelector("#attempts-list");
const timerBlock = document.querySelector("#timer-block");
const timerValue = document.querySelector("#timer-value");
const balanceStage = document.querySelector("#balance-stage");
const weightsRack = document.querySelector("#weights-rack");
const dropHighlight = document.querySelector("#drop-highlight");
const leftStack = document.querySelector("#left-stack");
const rightStack = document.querySelector("#right-stack");
const balanceArrow = document.querySelector("#balance-arrow");
const animalOnScale = document.querySelector("#animal-on-scale");
const modeDescription = document.querySelector("#mode-description");
const hintText = document.querySelector("#hint-text");
const submitButton = document.querySelector("#submit-weight");
const giveUpButton = document.querySelector("#give-up");
const overlay = document.querySelector("#overlay");
const modalTitle = document.querySelector("#modal-title");
const modalMessage = document.querySelector("#modal-message");
const modalActions = document.querySelector("#modal-actions");
const levelBadge = document.querySelector("#level-badge");

const animalsById = new Map(animals.map((animal) => [animal.id, animal]));
const gravity = 1800;
const dragThreshold = 4;
const doubleClickDelay = 300;
let dragState = null;
let weightElements = [];
const weightOrigins = new Map();
const weightColumns = new Map();
const fallingWeights = new Map();
let lastClick = {
  element: null,
  time: 0,
};
let weightAnimalKey = "";

document.body.classList.add("mode-animals");

const elements = {
  playerNameEl,
  scoreEl,
  progressEl,
  attemptsList,
  timerBlock,
  timerValue,
  hintText,
  overlay,
  modalTitle,
  modalMessage,
  modalActions,
  levelBadge,
};

function getCorrectedBasis(basisSize) {
  return Math.min(basisSize, window.innerWidth * 0.1);
}

function getAllWeights() {
  return weightElements.reduce(
    (sum, element) =>
      sum +
      (element.dataset.onScale === "true" ? Number(element.dataset.mass) : 0),
    0,
  );
}

function getPlatformHeight() {
  return (
    parseFloat(
      getComputedStyle(balanceStage).getPropertyValue("--platform-height"),
    ) || 18
  );
}

function updateBalancePositions() {
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
    (element) => element.dataset.onScale === "true",
  );
  const platformHeight = getPlatformHeight();
  const platformWidth = rightStack.getBoundingClientRect().width;
  placed.forEach((element) => {
    if (fallingWeights.has(element)) {
      return;
    }
    const elementWidth = element.getBoundingClientRect().width;
    const storedLeft = Number(element.dataset.dropLeft ?? 0);
    const left = Math.min(
      Math.max(0, storedLeft),
      platformWidth - elementWidth - 4,
    );
    element.style.left = `${Math.max(0, left)}px`;
    element.style.bottom = `${platformHeight}px`;
  });
}

function updateDropHighlightBounds() {
  dropHighlight.style.height = "";
  const balanceRect = balanceStage.getBoundingClientRect();
  const highlightRect = dropHighlight.getBoundingClientRect();
  if (highlightRect.top < balanceRect.top) {
    const offset = balanceRect.top - highlightRect.top;
    const newHeight = Math.max(0, highlightRect.height - offset);
    dropHighlight.style.height = `${newHeight}px`;
  }
}

function getColumnState(weightElement) {
  return weightColumns.get(weightElement.dataset.columnId);
}

function isTopWeightInColumn(weightElement) {
  const columnState = getColumnState(weightElement);
  if (!columnState) {
    return true;
  }
  return columnState.weights[columnState.weights.length - 1] === weightElement;
}

function updateColumnPositions(columnState) {
  columnState.weights.forEach((element) => {
    const origin = weightOrigins.get(element);
    if (!origin) {
      return;
    }
    element.style.left = `${origin.left}px`;
    element.style.top = `${origin.top}px`;
    element.style.bottom = "auto";
  });
}

function stopWeightFall(weightElement) {
  const fallState = fallingWeights.get(weightElement);
  if (!fallState) {
    return;
  }
  cancelAnimationFrame(fallState.frameId);
  fallingWeights.delete(weightElement);
}

function startWeightFall(weightElement) {
  stopWeightFall(weightElement);
  const platformHeight = getPlatformHeight();
  let velocity = 0;
  let lastTime = performance.now();

  const step = (time) => {
    const delta = (time - lastTime) / 1000;
    lastTime = time;
    velocity += gravity * delta;
    const currentBottom = parseFloat(weightElement.style.bottom) || 0;
    const nextBottom = currentBottom - velocity * delta;

    if (nextBottom <= platformHeight) {
      weightElement.style.bottom = `${platformHeight}px`;
      fallingWeights.delete(weightElement);
      return;
    }

    weightElement.style.bottom = `${nextBottom}px`;
    const frameId = requestAnimationFrame(step);
    fallingWeights.set(weightElement, { frameId });
  };

  const frameId = requestAnimationFrame(step);
  fallingWeights.set(weightElement, { frameId });
}

function getRandomRackPosition(weightElement) {
  const rackRect = weightsRack.getBoundingClientRect();
  const weightRect = weightElement.getBoundingClientRect();
  const maxX = Math.max(0, rackRect.width - weightRect.width);
  const maxY = Math.max(0, rackRect.height - weightRect.height);
  return {
    left: Math.random() * maxX,
    top: Math.random() * maxY,
  };
}

function setWeightRackOrigin(weightElement, { left, top }) {
  weightOrigins.set(weightElement, {
    parent: weightsRack,
    left,
    top,
  });
  weightElement.style.position = "absolute";
  weightElement.style.left = `${left}px`;
  weightElement.style.top = `${top}px`;
  weightElement.style.bottom = "auto";
}

function moveWeightToRackPosition(
  weightElement,
  { clientX, clientY, offsetX = 0, offsetY = 0 },
) {
  const rackRect = weightsRack.getBoundingClientRect();
  const weightRect = weightElement.getBoundingClientRect();
  const maxX = Math.max(0, rackRect.width - weightRect.width);
  const maxY = Math.max(0, rackRect.height - weightRect.height);
  const left = Math.min(Math.max(0, clientX - rackRect.left - offsetX), maxX);
  const top = Math.min(Math.max(0, clientY - rackRect.top - offsetY), maxY);
  const columnState = getColumnState(weightElement);
  stopWeightFall(weightElement);
  weightsRack.appendChild(weightElement);
  weightElement.dataset.onScale = "false";
  delete weightElement.dataset.dropLeft;
  weightElement.classList.remove("is-dragging");
  weightElement.style.zIndex = "";
  if (columnState) {
    columnState.weights = [weightElement];
  }
  setWeightRackOrigin(weightElement, { left, top });
  if (columnState) {
    updateColumnPositions(columnState);
  }
}

function resetWeightToOrigin(weightElement) {
  const origin = weightOrigins.get(weightElement);
  if (!origin) {
    return;
  }
  const columnState = getColumnState(weightElement);
  stopWeightFall(weightElement);
  origin.parent.appendChild(weightElement);
  weightElement.dataset.onScale = "false";
  delete weightElement.dataset.dropLeft;
  weightElement.classList.remove("is-dragging");
  weightElement.style.position = "absolute";
  weightElement.style.zIndex = "";
  if (columnState && !columnState.weights.includes(weightElement)) {
    columnState.weights.push(weightElement);
  }
  if (columnState) {
    updateColumnPositions(columnState);
  }
}

function placeWeightOnScale(weightElement, { dropX, offsetX = 0 } = {}) {
  const columnState = getColumnState(weightElement);
  if (columnState) {
    columnState.weights = columnState.weights.filter(
      (element) => element !== weightElement,
    );
    updateColumnPositions(columnState);
  }
  const weightRect = weightElement.getBoundingClientRect();
  const stackRect = rightStack.getBoundingClientRect();
  const elementWidth = weightRect.width;
  const maxLeft = stackRect.width - elementWidth - 4;
  const computedLeft =
    dropX === undefined || dropX === null
      ? (stackRect.width - elementWidth) / 2
      : dropX - stackRect.left - offsetX;
  const clampedLeft = Math.min(Math.max(0, computedLeft), maxLeft);
  const platformHeight = getPlatformHeight();
  const startBottom = Math.max(
    platformHeight,
    stackRect.bottom - weightRect.bottom,
  );

  rightStack.appendChild(weightElement);
  weightElement.dataset.onScale = "true";
  weightElement.dataset.dropLeft = `${clampedLeft}`;
  weightElement.classList.remove("is-dragging");
  weightElement.style.position = "absolute";
  weightElement.style.top = "auto";
  weightElement.style.zIndex = "2";
  weightElement.style.left = `${Math.max(0, clampedLeft)}px`;
  weightElement.style.bottom = `${startBottom}px`;
  startWeightFall(weightElement);
  updateBalancePositions();
}

function handleWeightMouseMove(event) {
  if (!dragState) {
    return;
  }

  if (!dragState.hasMoved) {
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (Math.hypot(deltaX, deltaY) < dragThreshold) {
      return;
    }
    dragState.hasMoved = true;
    const weightElement = dragState.element;
    const rect = weightElement.getBoundingClientRect();
    weightElement.classList.add("is-dragging");
    weightElement.style.position = "fixed";
    weightElement.style.left = `${rect.left}px`;
    weightElement.style.top = `${rect.top}px`;
    weightElement.style.bottom = "auto";
    weightElement.style.zIndex = "1000";
    dropHighlight.classList.add("is-active");
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

  if (!dragState.hasMoved) {
    const now = performance.now();
    if (
      lastClick.element === dragState.element &&
      now - lastClick.time <= doubleClickDelay
    ) {
      toggleWeightPlacement(dragState.element);
      updateBalancePositions();
      updateDropHighlightBounds();
      lastClick = { element: null, time: 0 };
    } else {
      lastClick = { element: dragState.element, time: now };
    }
    dragState = null;
    return;
  }

  const dropRect = dropHighlight.getBoundingClientRect();
  const isInside =
    event.clientX >= dropRect.left &&
    event.clientX <= dropRect.right &&
    event.clientY >= dropRect.top &&
    event.clientY <= dropRect.bottom;

  if (isInside) {
    placeWeightOnScale(dragState.element, {
      dropX: event.clientX,
      offsetX: dragState.offsetX,
    });
  } else {
    moveWeightToRackPosition(dragState.element, {
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: dragState.offsetX,
      offsetY: dragState.offsetY,
    });
    updateBalancePositions();
  }

  updateDropHighlightBounds();
  dragState = null;
}

function handleWeightMouseDown(event) {
  if (event.button !== 0) {
    return;
  }
  const weightElement = event.currentTarget;
  if (
    weightElement.dataset.onScale !== "true" &&
    !isTopWeightInColumn(weightElement)
  ) {
    return;
  }
  event.preventDefault();
  const rect = weightElement.getBoundingClientRect();
  stopWeightFall(weightElement);
  dragState = {
    element: weightElement,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    startX: event.clientX,
    startY: event.clientY,
    hasMoved: false,
  };

  document.addEventListener("mousemove", handleWeightMouseMove);
  document.addEventListener("mouseup", handleWeightMouseUp);
}

function toggleWeightPlacement(weightElement) {
  if (weightElement.dataset.onScale === "true") {
    resetWeightToOrigin(weightElement);
    updatePlacedWeightPositions();
    updateBalancePositions();
    return;
  }
  if (!isTopWeightInColumn(weightElement)) {
    return;
  }
  placeWeightOnScale(weightElement);
}

function renderAnimalsRack(weightAnimalIds) {
  weightsRack.innerHTML = "";
  weightElements = [];
  weightOrigins.clear();
  weightColumns.clear();

  const basis = getCorrectedBasis(80);
  const width = basis;
  const height = basis;

  weightAnimalIds.forEach((animalId, animalIndex) => {
    const animal = animalsById.get(animalId);
    if (!animal) {
      return;
    }

    for (let index = 0; index < 5; index += 1) {
      const columnId = `${animalIndex}-${index}`;
      const columnState = {
        element: weightsRack,
        weights: [],
        shift: 0,
      };
      const weightBlock = document.createElement("div");
      weightBlock.className = "weight-block animal-block";
      weightBlock.title = animal.name;
      weightBlock.style.setProperty("--weight-width", `${width}px`);
      weightBlock.style.setProperty("--weight-height", `${height}px`);
      weightBlock.style.setProperty("--weight-head-width", "0px");
      weightBlock.style.setProperty("--weight-head-height", "0px");
      weightBlock.style.setProperty(
        "--animal-image",
        `url(./assets/${animal.id}.jpg)`,
      );
      weightBlock.style.setProperty("--animal-color", animal.color);

      weightBlock.dataset.mass = animal.weight;
      weightBlock.dataset.onScale = "false";
      weightBlock.dataset.columnId = columnId;
      weightBlock.addEventListener("mousedown", handleWeightMouseDown);

      weightElements.push(weightBlock);
      columnState.weights.push(weightBlock);
      weightColumns.set(columnId, columnState);
      weightsRack.appendChild(weightBlock);
    }
  });

  requestAnimationFrame(() => {
    weightElements.forEach((weightElement) => {
      const position = getRandomRackPosition(weightElement);
      setWeightRackOrigin(weightElement, position);
    });
  });
}

function updateWeightModeAnimal(animal) {
  animalOnScale.src = `./assets/${animal.id}.jpg`;
  animalOnScale.alt = `Фото: ${animal.name}`;
}

function resetWeightsToRack() {
  weightElements.forEach((weightElement) => {
    if (weightElement.dataset.onScale === "true") {
      resetWeightToOrigin(weightElement);
    }
  });
  updatePlacedWeightPositions();
  updateBalancePositions();
  updateDropHighlightBounds();
}

function ensureWeightAnimalsRendered() {
  const state = game.getState();
  const weightAnimals = state?.weightAnimals ?? [];
  const nextKey = weightAnimals.join("|");
  if (!weightAnimals.length || nextKey === weightAnimalKey) {
    return;
  }
  weightAnimalKey = nextKey;
  renderAnimalsRack(weightAnimals);
}

const game = createGameCore({
  expectedMode: "animals",
  elements,
  animalsById,
  modes,
  difficulties,
  difficultyOrder,
  pickRandomAnimals,
  pickLevelAnimals: (state) => buildAnimalComparisonLevel(state.usedAnimals),
  addLeaderboardEntry,
  onModeMismatch: () => {
    const state = game.getState();
    if (state?.mode === "weights") {
      window.location.href = "game_weights.html";
      return;
    }
    window.location.href = "game_input.html";
  },
  onRoundStart: (animal) => {
    ensureWeightAnimalsRendered();
    resetWeightsToRack();
    updateWeightModeAnimal(animal);
  },
  getGuessValue,
  onInit: () => {
    modeDescription.textContent =
      "Перетащите животных на правую платформу и нажмите «Проверить вес».";
    ensureWeightAnimalsRendered();
    updateDropHighlightBounds();
  },
});

function currentAnimal() {
  const state = game.getState();
  return animalsById.get(state.levelAnimals[state.currentIndex]);
}

function getGuessValue() {
  const allWeights = getAllWeights();
  if (allWeights <= 0) {
    hintText.textContent = "Добавьте животных на платформу справа.";
    return null;
  }
  return allWeights;
}

function setupInputHandlers() {
  submitButton.addEventListener("click", game.handleSubmit);
  giveUpButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.state);
    window.location.href = "menu.html";
  });

  window.addEventListener("keydown", (event) => {
    if (!overlay.classList.contains("hidden")) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      game.handleSubmit();
    } else if (event.key === "Enter" && !overlay.classList.contains("hidden")) {
      const primaryButton = modalActions.querySelector("button");
      if (primaryButton) {
        primaryButton.click();
      }
    }
  });
}

function initGame() {
  game.init();
  setupInputHandlers();
  updateDropHighlightBounds();
  window.addEventListener("resize", () => {
    updateDropHighlightBounds();
    updatePlacedWeightPositions();
  });
}

initGame();
