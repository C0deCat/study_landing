import {
  DIFFICULTY_LEVELS,
  clearState,
  loadSettings,
  saveSettings,
  ensureLeaderboard,
} from "./game-data.js";

const menuForm = document.querySelector("#menuForm");
const nameInput = document.querySelector("#playerName");
const difficultyOptions = document.querySelector("#difficultyOptions");
const timedMode = document.querySelector("#timedMode");

let selectedIndex = 0;

const indicator = document.createElement("div");
indicator.classList.add("difficulty-indicator");

difficultyOptions.appendChild(indicator);

DIFFICULTY_LEVELS.forEach((level, index) => {
  const option = document.createElement("button");
  option.type = "button";
  option.className = "difficulty-option";
  option.dataset.index = String(index);
  option.setAttribute("role", "radio");
  option.innerHTML = `
    <strong>${level.label}</strong>
    <span>${level.attempts} попыток • ${level.timeLimit} сек на животное</span>
  `;
  option.addEventListener("click", () => updateSelection(index));
  difficultyOptions.appendChild(option);
});

function updateSelection(index) {
  selectedIndex = index;
  const options = [...difficultyOptions.querySelectorAll(".difficulty-option")];
  options.forEach((option, optionIndex) => {
    option.classList.toggle("selected", optionIndex === index);
    option.setAttribute("aria-checked", optionIndex === index);
  });
  indicator.style.transform = `translateY(${index * 76}px)`;
}

const savedSettings = loadSettings();
if (savedSettings) {
  nameInput.value = savedSettings.playerName || "";
  selectedIndex = savedSettings.difficultyIndex ?? 0;
  timedMode.checked = Boolean(savedSettings.timed);
}

updateSelection(selectedIndex);

menuForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const playerName = nameInput.value.trim();
  if (!playerName) {
    nameInput.focus();
    return;
  }

  saveSettings({
    playerName,
    difficultyIndex: selectedIndex,
    timed: timedMode.checked,
  });
  clearState();
  ensureLeaderboard();
  window.location.href = "game.html";
});

document.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    const direction = event.key === "ArrowUp" ? -1 : 1;
    const nextIndex =
      (selectedIndex + direction + DIFFICULTY_LEVELS.length) %
      DIFFICULTY_LEVELS.length;
    updateSelection(nextIndex);
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    timedMode.checked = !timedMode.checked;
  }

  if (event.key === "Enter" && document.activeElement !== nameInput) {
    menuForm.requestSubmit();
  }
});

nameInput.focus();
