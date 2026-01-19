export const STORAGE_KEYS = {
  state: "gw_state",
  leaderboard: "gw_leaderboard",
};

export const difficulties = {
  easy: {
    id: "easy",
    label: "Легкий",
    attempts: 5,
    multiplier: 1,
    timeLimit: 60,
  },
  medium: {
    id: "medium",
    label: "Средний",
    attempts: 4,
    multiplier: 2,
    timeLimit: 45,
  },
  hard: {
    id: "hard",
    label: "Сложный",
    attempts: 3,
    multiplier: 3,
    timeLimit: 30,
  },
};

export const difficultyOrder = ["easy", "medium", "hard"];

export const modes = [
  { id: "weights", modeName: "Подбор гирьками", modeModifier: 1 },
  { id: "input", modeName: "Ввод веса", modeModifier: 5 },
];

export const modeOrder = ["weights", "input"];

export const weights = [
  { mass: 1000, amount: 1, basisSize: 90 },
  { mass: 500, amount: 2, basisSize: 84 },
  { mass: 200, amount: 2, basisSize: 76 },
  { mass: 100, amount: 2, basisSize: 70 },
  { mass: 50, amount: 2, basisSize: 62 },
  { mass: 20, amount: 3, basisSize: 54 },
  { mass: 10, amount: 3, basisSize: 48 },
  { mass: 5, amount: 3, basisSize: 42 },
  { mass: 2, amount: 3, basisSize: 36 },
  { mass: 1, amount: 3, basisSize: 32 },
];

export const animals = [
  { id: "lynx", name: "Рысь", weight: 27, color: "#f08a5d" },
  { id: "wolf", name: "Волк", weight: 45, color: "#b83b5e" },
  { id: "fox", name: "Лиса", weight: 6, color: "#6a2c70" },
  { id: "moose", name: "Лось", weight: 408, color: "#355c7d" },
  { id: "bear", name: "Бурый медведь", weight: 185, color: "#f67280" },
  { id: "boar", name: "Кабан", weight: 79, color: "#c06c84" },
  { id: "eagle", name: "Орлан", weight: 4.9, color: "#355c7d" },
  { id: "owl", name: "Сова", weight: 2.7, color: "#99b898" },
  { id: "seal", name: "Тюлень", weight: 82, color: "#2a363b" },
  { id: "dolphin", name: "Дельфин", weight: 175, color: "#00a8cc" },
  { id: "camel", name: "Верблюд", weight: 475, color: "#f8b400" },
  { id: "elephant", name: "Слон", weight: 5300, color: "#6c5b7b" },
  { id: "giraffe", name: "Жираф", weight: 1010, color: "#c06c84" },
  { id: "kangaroo", name: "Кенгуру", weight: 51, color: "#f67280" },
  { id: "panda", name: "Панда", weight: 100, color: "#355c7d" },
  { id: "tiger", name: "Тигр", weight: 195, color: "#ff847c" },
  { id: "horse", name: "Лошадь", weight: 520, color: "#2a9d8f" },
  { id: "rhino", name: "Носорог", weight: 1900, color: "#e76f51" },
  { id: "hippo", name: "Бегемот", weight: 2113, color: "#264653" },
  { id: "zebra", name: "Зебра", weight: 242, color: "#118ab2" },
];

const initialLeaderboard = [
  { name: "Алиса", score: 68, difficulty: "Сложный", timed: true },
  { name: "Марко", score: 64, difficulty: "Сложный", timed: true },
  { name: "Соня", score: 61, difficulty: "Сложный", timed: false },
  { name: "Кирилл", score: 59, difficulty: "Сложный", timed: true },
  { name: "Никита", score: 56, difficulty: "Сложный", timed: false },
  { name: "Полина", score: 54, difficulty: "Сложный", timed: true },
  { name: "Артем", score: 52, difficulty: "Сложный", timed: false },
  { name: "Яна", score: 50, difficulty: "Сложный", timed: true },
  { name: "Денис", score: 47, difficulty: "Средний", timed: true },
  { name: "Ева", score: 46, difficulty: "Средний", timed: true },
  { name: "Олег", score: 45, difficulty: "Средний", timed: false },
  { name: "Роман", score: 43, difficulty: "Средний", timed: true },
  { name: "Ирина", score: 42, difficulty: "Средний", timed: false },
  { name: "Даша", score: 41, difficulty: "Средний", timed: true },
  { name: "Сергей", score: 39, difficulty: "Средний", timed: false },
  { name: "Вика", score: 36, difficulty: "Легкий", timed: true },
  { name: "Глеб", score: 35, difficulty: "Легкий", timed: false },
  { name: "Лиза", score: 33, difficulty: "Легкий", timed: true },
  { name: "Максим", score: 32, difficulty: "Легкий", timed: false },
  { name: "Илья", score: 30, difficulty: "Легкий", timed: false },
];

export function initLeaderboard() {
  if (!localStorage.getItem(STORAGE_KEYS.leaderboard)) {
    localStorage.setItem(
      STORAGE_KEYS.leaderboard,
      JSON.stringify(initialLeaderboard)
    );
  }
}

export function getLeaderboard() {
  initLeaderboard();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.leaderboard)) || [];
  } catch (error) {
    return [];
  }
}

export function saveLeaderboard(entries) {
  localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(entries));
}

export function addLeaderboardEntry(entry) {
  const entries = getLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, 20);
  saveLeaderboard(trimmed);
  return trimmed;
}

export function pickRandomAnimals(excludedIds, count) {
  const available = animals.filter(
    (animal) => !excludedIds.includes(animal.id)
  );
  const shuffled = [...available];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled.slice(0, count).map((animal) => animal.id);
}
