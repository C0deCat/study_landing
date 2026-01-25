const STORAGE_KEYS = {
  state: "gw_state",
  leaderboard: "gw_leaderboard",
};

const difficulties = {
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

const difficultyOrder = ["easy", "medium", "hard"];

const modes = [
  { id: "weights", modeName: "Подбор гирьками", modeModifier: 1 },
  { id: "animals", modeName: "Сравнение животных", modeModifier: 3 },
  { id: "input", modeName: "Ввод веса", modeModifier: 5 },
];

const modeOrder = ["weights", "animals", "input"];

const weights = [
  { mass: 1000, amount: 5, basisSize: 70 },
  { mass: 500, amount: 5, basisSize: 60 },
  { mass: 200, amount: 5, basisSize: 50 },
  { mass: 100, amount: 5, basisSize: 40 },
  { mass: 50, amount: 5, basisSize: 35 },
  { mass: 20, amount: 5, basisSize: 30 },
  { mass: 10, amount: 5, basisSize: 30 },
  { mass: 5, amount: 5, basisSize: 30 },
  { mass: 2, amount: 5, basisSize: 30 },
  { mass: 1, amount: 5, basisSize: 30 },
];

const animals = [
  { id: "lynx", name: "Рысь", weight: 27, color: "#f08a5d" },
  { id: "wolf", name: "Волк", weight: 45, color: "#b83b5e" },
  { id: "fox", name: "Лиса", weight: 6, color: "#6a2c70" },
  { id: "moose", name: "Лось", weight: 408, color: "#355c7d" },
  { id: "bear", name: "Бурый медведь", weight: 185, color: "#f67280" },
  { id: "boar", name: "Кабан", weight: 79, color: "#c06c84" },
  { id: "eagle", name: "Орлан", weight: 4, color: "#355c7d" },
  { id: "owl", name: "Сова", weight: 3, color: "#99b898" },
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

const animalsById = new Map(animals.map((animal) => [animal.id, animal]));

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

function initLeaderboard() {
  if (!localStorage.getItem(STORAGE_KEYS.leaderboard)) {
    localStorage.setItem(
      STORAGE_KEYS.leaderboard,
      JSON.stringify(initialLeaderboard),
    );
  }
}

function getLeaderboard() {
  initLeaderboard();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.leaderboard)) || [];
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(entries));
}

function addLeaderboardEntry(entry) {
  const entries = getLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, 20);
  saveLeaderboard(trimmed);
  return trimmed;
}

function shuffleList(list) {
  const shuffled = [...list];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function buildPossibleWeights(selectedAnimals) {
  let sums = new Set([0]);
  selectedAnimals.forEach((animal) => {
    const nextSums = new Set();
    sums.forEach((sum) => {
      for (let count = 0; count <= 5; count += 1) {
        nextSums.add(sum + animal.weight * count);
      }
    });
    sums = nextSums;
  });
  return sums;
}

function canApproximateWeight(targetWeight, sums) {
  const tolerance = targetWeight * 0.1;
  for (const sum of sums) {
    if (Math.abs(sum - targetWeight) <= tolerance) {
      return true;
    }
  }
  return false;
}

function pickFromPool(poolIds, excludedIds, count) {
  const available = poolIds.filter((id) => !excludedIds.includes(id));
  let isExhausted = false;
  let selected = shuffleList(available).slice(0, count);
  if (selected.length < count) {
    isExhausted = true;
    const excludedPool = excludedIds.filter((id) => poolIds.includes(id));
    selected = [
      ...selected,
      ...shuffleList(excludedPool).slice(0, count - selected.length),
    ];
  }
  return { ids: selected, isExhausted };
}

function pickRandomAnimals(excludedIds, count) {
  const available = animals.filter(
    (animal) => !excludedIds.includes(animal.id),
  );
  let isExhausted = false;
  let selected = shuffleList(available).slice(0, count);
  if (selected.length < count) {
    isExhausted = true;
    const excludedAnimals = excludedIds
      .map((id) => animalsById.get(id))
      .filter(Boolean);
    selected = [
      ...selected,
      ...shuffleList(excludedAnimals).slice(0, count - selected.length),
    ];
  }
  return { ids: selected.map((animal) => animal.id), isExhausted };
}

function buildAnimalComparisonLevel(usedAnimals, count = 5) {
  const animalIds = animals.map((animal) => animal.id);
  let attempt = 0;

  while (attempt < 100) {
    attempt += 1;
    const weightAnimals = shuffleList(animalIds).slice(0, count);
    const weightAnimalObjects = weightAnimals
      .map((id) => animalsById.get(id))
      .filter(Boolean);
    const possibleWeights = buildPossibleWeights(weightAnimalObjects);
    const targetPool = animals.filter(
      (animal) =>
        !weightAnimals.includes(animal.id) &&
        canApproximateWeight(animal.weight, possibleWeights),
    );

    if (targetPool.length < count) {
      continue;
    }

    const { ids: levelAnimals, isExhausted } = pickFromPool(
      targetPool.map((animal) => animal.id),
      usedAnimals,
      count,
    );

    let nextUsed = [...usedAnimals];
    if (isExhausted) {
      nextUsed = nextUsed.slice(5);
    }
    nextUsed = [...nextUsed, ...levelAnimals];

    return {
      levelAnimals,
      usedAnimals: nextUsed,
      weightAnimals,
    };
  }

  const fallbackWeightAnimals = animalIds.slice(0, count);
  const fallbackWeights = fallbackWeightAnimals
    .map((id) => animalsById.get(id))
    .filter(Boolean);
  const possibleWeights = buildPossibleWeights(fallbackWeights);
  const targetPool = animals.filter(
    (animal) =>
      !fallbackWeightAnimals.includes(animal.id) &&
      canApproximateWeight(animal.weight, possibleWeights),
  );
  const { ids: levelAnimals, isExhausted } = pickFromPool(
    targetPool.map((animal) => animal.id),
    usedAnimals,
    count,
  );
  let nextUsed = [...usedAnimals];
  if (isExhausted) {
    nextUsed = nextUsed.slice(5);
  }
  nextUsed = [...nextUsed, ...levelAnimals];

  return {
    levelAnimals,
    usedAnimals: nextUsed,
    weightAnimals: fallbackWeightAnimals,
  };
}

window.GameData = {
  STORAGE_KEYS,
  difficulties,
  difficultyOrder,
  modes,
  modeOrder,
  weights,
  animals,
  initLeaderboard,
  getLeaderboard,
  saveLeaderboard,
  addLeaderboardEntry,
  pickRandomAnimals,
  buildAnimalComparisonLevel,
};
