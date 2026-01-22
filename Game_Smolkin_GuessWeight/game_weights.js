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
let dragState = null;
let weightElements = [];
const weightOrigins = new Map();
const weightColumns = new Map();
const fallingWeights = new Map();

document.body.classList.add("mode-weights");

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
    return false;
  }
  return columnState.weights[columnState.weights.length - 1] === weightElement;
}

function updateColumnPositions(columnState) {
  columnState.weights.forEach((element, index) => {
    const offset = index * columnState.shift;
    element.style.left = `${offset}px`;
    element.style.bottom = `${offset}px`;
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

function resetWeightToOrigin(weightElement) {
  const origin = weightOrigins.get(weightElement);
  if (!origin) {
    return;
  }
  const columnState = getColumnState(weightElement);
  if (!columnState) {
    return;
  }
  stopWeightFall(weightElement);
  origin.parent.appendChild(weightElement);
  weightElement.dataset.onScale = "false";
  delete weightElement.dataset.dropLeft;
  weightElement.classList.remove("is-dragging");
  weightElement.style.position = "absolute";
  weightElement.style.top = "auto";
  weightElement.style.zIndex = "";
  if (!columnState.weights.includes(weightElement)) {
    columnState.weights.push(weightElement);
  }
  updateColumnPositions(columnState);
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

  const isAlreadyDragging = dragState.element.classList.contains("is-dragging");
  if (!isAlreadyDragging) {
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
    resetWeightToOrigin(dragState.element);
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
  };

  document.addEventListener("mousemove", handleWeightMouseMove);
  document.addEventListener("mouseup", handleWeightMouseUp);
}

function handleWeightDoubleClick(event) {
  if (dragState) {
    return;
  }
  if (event.button !== 0) {
    return;
  }
  const weightElement = event.currentTarget;
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

function renderWeightsRack() {
  weightsRack.innerHTML = "";
  weightElements = [];
  weightOrigins.clear();
  weightColumns.clear();

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

    const columnId = String(weightIndex);
    const columnState = {
      element: column,
      weights: [],
      shift,
    };
    weightColumns.set(columnId, columnState);

    for (let index = 0; index < weight.amount; index += 1) {
      const weightBlock = document.createElement("div");
      weightBlock.className = "weight-block";
      weightBlock.textContent = weight.mass;
      weightBlock.style.setProperty("--weight-width", `${width}px`);
      weightBlock.style.setProperty("--weight-height", `${height}px`);
      weightBlock.style.setProperty("--weight-head-width", `${headWidth}px`);
      weightBlock.style.setProperty("--weight-head-height", `${headHeight}px`);
      const hue = 210 - weightIndex * 12;
      weightBlock.style.setProperty("--weight-color", `hsl(${hue} 45% 45%)`);

      const offset = index * shift;
      weightBlock.dataset.mass = weight.mass;
      weightBlock.dataset.onScale = "false";
      weightBlock.dataset.columnId = columnId;
      weightBlock.addEventListener("mousedown", handleWeightMouseDown);
      weightBlock.addEventListener("dblclick", handleWeightDoubleClick);

      weightElements.push(weightBlock);
      weightOrigins.set(weightBlock, {
        parent: column,
      });
      columnState.weights.push(weightBlock);
      column.appendChild(weightBlock);
    }

    updateColumnPositions(columnState);
    weightsRack.appendChild(column);
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

const game = createGameCore({
  expectedMode: "weights",
  elements,
  animalsById,
  modes,
  difficulties,
  difficultyOrder,
  pickRandomAnimals,
  addLeaderboardEntry,
  onModeMismatch: () => {
    const state = game.getState();
    if (state?.mode === "animals") {
      window.location.href = "game_animals.html";
      return;
    }
    window.location.href = "game_input.html";
  },
  onRoundStart: (animal) => {
    resetWeightsToRack();
    updateWeightModeAnimal(animal);
  },
  getGuessValue,
  onInit: () => {
    modeDescription.textContent =
      "Перетащите гири на правую платформу и нажмите «Проверить вес».";
    renderWeightsRack();
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
    hintText.textContent = "Добавьте гири на платформу справа.";
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
