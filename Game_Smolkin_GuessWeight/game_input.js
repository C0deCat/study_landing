const playerNameEl = document.querySelector("#player-name");
const scoreEl = document.querySelector("#current-score");
const progressEl = document.querySelector("#progress");
const attemptsList = document.querySelector("#attempts-list");
const timerBlock = document.querySelector("#timer-block");
const timerValue = document.querySelector("#timer-value");
const cardStage = document.querySelector("#card-stage");
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
      { once: true },
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

function getGuessValue() {
  const value = Number(weightInput.value);
  if (!value || value <= 0) {
    hintText.textContent = "Введите корректное число.";
    return null;
  }
  return value;
}

const game = createGameCore({
  expectedMode: "input",
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
    window.location.href = "game_weights.html";
  },
  onRoundStart: (animal) => {
    swapCard(animal);
  },
  getGuessValue,
  onClearInput: () => {
    weightInput.value = "";
  },
  onInit: () => {
    modeDescription.textContent =
      "Введите предполагаемый вес животного и нажмите «Проверить вес».";
  },
});

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
}

initGame();
