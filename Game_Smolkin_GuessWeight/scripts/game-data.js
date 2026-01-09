export const STORAGE_KEYS = {
  settings: "guessWeightSettings",
  state: "guessWeightState",
  leaderboard: "guessWeightLeaderboard",
};

export const DIFFICULTY_LEVELS = [
  {
    id: "easy",
    label: "Легкий",
    attempts: 5,
    timeLimit: 60,
    multiplier: 1,
  },
  {
    id: "medium",
    label: "Средний",
    attempts: 4,
    timeLimit: 45,
    multiplier: 2,
  },
  {
    id: "hard",
    label: "Сложный",
    attempts: 3,
    timeLimit: 30,
    multiplier: 3,
  },
];

export const ANIMALS = [
  { id: 1, name: "Слон", weight: 5400, color: "#7b7f9e" },
  { id: 2, name: "Жираф", weight: 800, color: "#d4a373" },
  { id: 3, name: "Носорог", weight: 2300, color: "#8d99ae" },
  { id: 4, name: "Бурый медведь", weight: 340, color: "#9b5e3c" },
  { id: 5, name: "Лось", weight: 450, color: "#6c584c" },
  { id: 6, name: "Лев", weight: 190, color: "#f2cc8f" },
  { id: 7, name: "Тигр", weight: 220, color: "#f4a261" },
  { id: 8, name: "Панда", weight: 110, color: "#adb5bd" },
  { id: 9, name: "Гиппопотам", weight: 1500, color: "#6c757d" },
  { id: 10, name: "Крокодил", weight: 500, color: "#52796f" },
  { id: 11, name: "Олень", weight: 160, color: "#a98467" },
  { id: 12, name: "Волк", weight: 55, color: "#495057" },
  { id: 13, name: "Лиса", weight: 12, color: "#ffb703" },
  { id: 14, name: "Кенгуру", weight: 85, color: "#e07a5f" },
  { id: 15, name: "Зебра", weight: 320, color: "#adb5bd" },
  { id: 16, name: "Верблюд", weight: 600, color: "#c9ada7" },
  { id: 17, name: "Пума", weight: 70, color: "#bc6c25" },
  { id: 18, name: "Коала", weight: 13, color: "#b7b7a4" },
  { id: 19, name: "Окапи", weight: 250, color: "#6d597a" },
  { id: 20, name: "Морж", weight: 1100, color: "#457b9d" },
];

export const DEFAULT_LEADERBOARD = [
  { name: "Артем", score: 980 },
  { name: "Виктория", score: 920 },
  { name: "Марина", score: 880 },
  { name: "Сергей", score: 850 },
  { name: "Елизавета", score: 820 },
  { name: "Кирилл", score: 790 },
  { name: "Дарья", score: 760 },
  { name: "Илья", score: 740 },
  { name: "Полина", score: 710 },
  { name: "Никита", score: 690 },
  { name: "Анна", score: 670 },
  { name: "Роман", score: 650 },
  { name: "Алиса", score: 640 },
  { name: "Денис", score: 620 },
  { name: "Юлия", score: 600 },
  { name: "Георгий", score: 580 },
  { name: "София", score: 560 },
  { name: "Максим", score: 540 },
  { name: "Алина", score: 520 },
  { name: "Матвей", score: 500 },
];

export function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  return raw ? JSON.parse(raw) : null;
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEYS.state);
  return raw ? JSON.parse(raw) : null;
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEYS.state);
}

export function ensureLeaderboard() {
  const existing = localStorage.getItem(STORAGE_KEYS.leaderboard);
  if (!existing) {
    localStorage.setItem(
      STORAGE_KEYS.leaderboard,
      JSON.stringify(DEFAULT_LEADERBOARD)
    );
  }
}

export function loadLeaderboard() {
  ensureLeaderboard();
  const raw = localStorage.getItem(STORAGE_KEYS.leaderboard);
  return raw ? JSON.parse(raw) : [...DEFAULT_LEADERBOARD];
}

export function saveLeaderboard(entries) {
  localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(entries));
}

export function getDifficultyLabel(index) {
  return DIFFICULTY_LEVELS[index]?.label ?? "—";
}

export function calculateFinalScore(state) {
  const difficulty = DIFFICULTY_LEVELS[state.highestLevelIndex];
  const difficultyMultiplier = difficulty ? difficulty.multiplier : 1;
  const timeMultiplier = state.timed ? 2 : 1;
  return Math.max(
    0,
    Math.round(state.totalBasePoints * difficultyMultiplier * timeMultiplier)
  );
}

export function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
