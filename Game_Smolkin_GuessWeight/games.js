function createGameCore({
  expectedMode,
  elements,
  animalsById,
  modes,
  difficulties,
  difficultyOrder,
  pickRandomAnimals,
  pickLevelAnimals,
  addLeaderboardEntry,
  onModeMismatch,
  onRoundStart,
  getGuessValue,
  onClearInput,
  onInit,
}) {
  let state = loadState();
  let timerId = null;
  let timeRemaining = null;

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

  function loadStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("state");
    if (!encoded) {
      return null;
    }
    try {
      const decoded = decodeURIComponent(atob(encoded));
      const parsed = JSON.parse(decoded);
      window.history.replaceState({}, "", window.location.pathname);
      return parsed;
    } catch (error) {
      return null;
    }
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

  function renderAttempts() {
    elements.attemptsList.innerHTML = "";
    const total = getDifficultySettings().attempts;
    for (let i = 0; i < total; i += 1) {
      const dot = document.createElement("span");
      dot.className = "attempt-dot";
      if (i < state.attemptsLeft) {
        dot.classList.add("is-remaining");
      }
      elements.attemptsList.appendChild(dot);
    }
  }

  function updateHeader() {
    elements.scoreEl.textContent = state.baseScore;
    elements.progressEl.textContent = `${state.currentIndex + 1} / ${
      state.levelAnimals.length
    }`;
    elements.levelBadge.textContent = `Уровень: ${
      getDifficultySettings().label
    }`;
    renderAttempts();
    elements.timerBlock.style.display = state.timeMode ? "block" : "none";
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
    elements.hintText.textContent = "Время вышло. Попытка потрачена.";
    if (state.attemptsLeft <= 0) {
      handleLoss();
      return;
    }
    updateHeader();
    saveState();
    startTimer();
  }

  function startTimer() {
    clearTimer();
    if (!state.timeMode) {
      elements.timerValue.textContent = "--:--";
      return;
    }
    timeRemaining = getDifficultySettings().timeLimit;
    elements.timerValue.textContent = formatTime(timeRemaining);
    timerId = setInterval(() => {
      timeRemaining -= 1;
      if (timeRemaining <= 0) {
        clearTimer();
        handleTimeout();
        return;
      }
      elements.timerValue.textContent = formatTime(timeRemaining);
    }, 1000);
  }

  function currentAnimal() {
    return animalsById.get(state.levelAnimals[state.currentIndex]);
  }

  function computeFinalScore() {
    const highestMultiplier =
      difficulties[state.highestDifficulty]?.multiplier || 1;
    const timedMultiplier = state.timeMode ? 2 : 1;
    const modeMultiplier = getModeSettings()?.modeModifier || 1;
    return (
      state.baseScore * highestMultiplier * timedMultiplier * modeMultiplier
    );
  }

  function saveScore() {
    const highestLabel = difficulties[state.highestDifficulty]?.label || "";
    const entry = {
      name: state.playerName,
      score: computeFinalScore(),
      difficulty: highestLabel,
      timed: state.timeMode,
    };
    addLeaderboardEntry(entry);
    return entry;
  }

  function showModal({ title, message, canContinue, isWin }) {
    elements.overlay.classList.remove("hidden");
    elements.modalTitle.textContent = title;
    elements.modalMessage.textContent = message;
    elements.modalActions.innerHTML = "";

    if (canContinue) {
      const continueButton = document.createElement("button");
      continueButton.className = "primary";
      continueButton.textContent = "Продолжить уровень";
      continueButton.addEventListener("click", () => {
        elements.overlay.classList.add("hidden");
        moveToNextLevel();
      });
      elements.modalActions.appendChild(continueButton);
    }

    const saveButton = document.createElement("button");
    saveButton.className = canContinue ? "secondary" : "primary";
    saveButton.textContent = "Сохранить результат";
    saveButton.addEventListener("click", () => {
      const entry = saveScore();
      const encoded = btoa(encodeURIComponent(JSON.stringify(entry)));
      window.location.href = `leaderboard.html?result=${encoded}`;
    });
    elements.modalActions.appendChild(saveButton);

    const exitButton = document.createElement("button");
    exitButton.className = "secondary";
    exitButton.textContent = isWin ? "В меню" : "Начать заново";
    exitButton.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEYS.state);
      window.location.href = "menu.html";
    });
    elements.modalActions.appendChild(exitButton);

    const focusTarget = elements.modalActions.querySelector("button");
    if (focusTarget) {
      focusTarget.focus();
    }
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
    elements.hintText.textContent = `Верно! Вес ${animal.name} ≈ ${animal.weight} кг.`;
    updateHeader();
    saveState();
    onRoundStart?.(currentAnimal());
    startTimer();
  }

  function handleIncorrectGuess(isHigh) {
    state.attemptsLeft -= 1;
    state.failedAttemptsCurrent += 1;
    if (state.attemptsLeft <= 0) {
      elements.hintText.textContent = "Попытки закончились.";
      handleLoss();
      return;
    }
    elements.hintText.textContent = isHigh
      ? "Слишком много! Попробуйте меньше."
      : "Слишком мало! Попробуйте больше.";
    updateHeader();
    saveState();
    startTimer();
  }

  function moveToNextLevel() {
    const currentIndex = difficultyOrder.indexOf(state.difficulty);
    const nextDifficulty = difficultyOrder[currentIndex + 1];
    if (!nextDifficulty) {
      return;
    }
    state.difficulty = nextDifficulty;
    state.highestDifficulty = nextDifficulty;
    if (pickLevelAnimals) {
      const nextLevel = pickLevelAnimals(state);
      state.levelAnimals = nextLevel.levelAnimals;
      state.usedAnimals = nextLevel.usedAnimals;
      if (nextLevel.weightAnimals) {
        state.weightAnimals = nextLevel.weightAnimals;
      }
    } else {
      const { ids: levelAnimals, isExhausted } = pickRandomAnimals(
        state.usedAnimals,
        5,
      );
      if (isExhausted) {
        state.usedAnimals = state.usedAnimals.slice(5);
      }
      state.levelAnimals = levelAnimals;
      state.usedAnimals = [...state.usedAnimals, ...state.levelAnimals];
    }
    state.baseScore = 0;
    state.currentIndex = 0;
    state.completedAnimals = 0;
    state.failedAttemptsCurrent = 0;
    state.attemptsLeft = difficulties[nextDifficulty].attempts;
    elements.hintText.textContent = "Новый уровень!";
    updateHeader();
    saveState();
    onRoundStart?.(currentAnimal());
    startTimer();
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
    onClearInput?.();
    const tolerance = animal.weight * 0.1;
    const isCorrect = Math.abs(animal.weight - value) <= tolerance;
    if (isCorrect) {
      handleCorrectGuess(animal);
    } else {
      handleIncorrectGuess(value > animal.weight);
    }
  }

  function init() {
    if (!state) {
      state = loadStateFromUrl();
      if (state) {
        saveState();
      }
    }
    if (!state) {
      window.location.href = "menu.html";
      return;
    }
    if (!state.mode) {
      state.mode = expectedMode;
    }
    if (state.mode !== expectedMode) {
      onModeMismatch?.();
      return;
    }
    elements.playerNameEl.textContent = state.playerName;
    updateHeader();
    onInit?.();
    onRoundStart?.(currentAnimal());
    startTimer();
  }

  return {
    init,
    handleSubmit,
    getState: () => state,
    currentAnimal,
    updateHeader,
  };
}
