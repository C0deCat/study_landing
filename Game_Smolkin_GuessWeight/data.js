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

export const animals = [
  { id: "lynx", name: "Рысь", weight: 18, color: "#f08a5d" },
  { id: "wolf", name: "Волк", weight: 45, color: "#b83b5e" },
  { id: "fox", name: "Лиса", weight: 7, color: "#6a2c70" },
  { id: "moose", name: "Лось", weight: 420, color: "#355c7d" },
  { id: "bear", name: "Бурый медведь", weight: 320, color: "#f67280" },
  { id: "boar", name: "Кабан", weight: 110, color: "#c06c84" },
  { id: "eagle", name: "Орлан", weight: 6, color: "#355c7d" },
  { id: "owl", name: "Сова", weight: 2.5, color: "#99b898" },
  { id: "seal", name: "Тюлень", weight: 120, color: "#2a363b" },
  { id: "dolphin", name: "Дельфин", weight: 150, color: "#00a8cc" },
  { id: "camel", name: "Верблюд", weight: 540, color: "#f8b400" },
  { id: "elephant", name: "Слон", weight: 4800, color: "#6c5b7b" },
  { id: "giraffe", name: "Жираф", weight: 900, color: "#c06c84" },
  { id: "kangaroo", name: "Кенгуру", weight: 85, color: "#f67280" },
  { id: "panda", name: "Панда", weight: 100, color: "#355c7d" },
  { id: "tiger", name: "Тигр", weight: 220, color: "#ff847c" },
  { id: "horse", name: "Лошадь", weight: 500, color: "#2a9d8f" },
  { id: "rhino", name: "Носорог", weight: 2300, color: "#e76f51" },
  { id: "hippo", name: "Бегемот", weight: 3000, color: "#264653" },
  { id: "zebra", name: "Зебра", weight: 350, color: "#118ab2" },
];

const initialLeaderboard = [
  { name: "Алиса", score: 680, difficulty: "Сложный", timed: true },
  { name: "Марко", score: 640, difficulty: "Сложный", timed: true },
  { name: "Соня", score: 610, difficulty: "Сложный", timed: false },
  { name: "Кирилл", score: 590, difficulty: "Сложный", timed: true },
  { name: "Никита", score: 560, difficulty: "Сложный", timed: false },
  { name: "Полина", score: 540, difficulty: "Сложный", timed: true },
  { name: "Артем", score: 520, difficulty: "Сложный", timed: false },
  { name: "Яна", score: 500, difficulty: "Сложный", timed: true },
  { name: "Денис", score: 470, difficulty: "Средний", timed: true },
  { name: "Ева", score: 460, difficulty: "Средний", timed: true },
  { name: "Олег", score: 445, difficulty: "Средний", timed: false },
  { name: "Роман", score: 430, difficulty: "Средний", timed: true },
  { name: "Ирина", score: 420, difficulty: "Средний", timed: false },
  { name: "Даша", score: 410, difficulty: "Средний", timed: true },
  { name: "Сергей", score: 395, difficulty: "Средний", timed: false },
  { name: "Вика", score: 360, difficulty: "Легкий", timed: true },
  { name: "Глеб", score: 350, difficulty: "Легкий", timed: false },
  { name: "Лиза", score: 335, difficulty: "Легкий", timed: true },
  { name: "Максим", score: 320, difficulty: "Легкий", timed: false },
  { name: "Илья", score: 300, difficulty: "Легкий", timed: false },
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
  const available = animals.filter((animal) => !excludedIds.includes(animal.id));
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
