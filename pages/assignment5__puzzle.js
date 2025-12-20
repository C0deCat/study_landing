const puzzle_assets = [
  "../assets/assignment5/head.png",
  "../assets/assignment5/body.png",
  "../assets/assignment5/rear_legs.png",
  "../assets/assignment5/hind_legs.png",
];

const result_coords = [
  { x: 0, y: 0 },
  { x: 268, y: 202 },
  { x: 60, y: 276 },
  { x: 624, y: 212 },
];

// Включите, чтобы упростить подбор правильных координат result_coords.
const DEBUG_MODE = false;
// Управление размером кусочков
const size_coeff = 0.4;
// Приемлемая ошибка при проверке решения пазла (в пикселях)
const ACCEPTABLE_ERROR = 5;

const area = document.getElementById("puzzle-area");
const restartButton = document.getElementById("restart");
let pieces_coords = JSON.parse(JSON.stringify(result_coords));
let rotations = new Map();
let pieces = [];
let dragState = null;
let isAnimating = false;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const toNumber = (value) => parseFloat(value) || 0;

const idFromPath = (path) => {
  const lastSlash = path.lastIndexOf("/");
  const dot = path.lastIndexOf(".");
  return path.slice(lastSlash + 1, dot);
};

const createPiece = async (src) => {
  return new Promise((resolve) => {
    const wrapper = document.createElement("div");
    wrapper.className = "piece";
    wrapper.id = idFromPath(src);

    const img = document.createElement("img");
    img.src = src;
    img.alt = idFromPath(src);

    img.onload = () => {
      wrapper.style.width = `${img.naturalWidth * size_coeff}px`;
      wrapper.style.height = `${img.naturalHeight * size_coeff}px`;
      resolve(wrapper);
    };

    wrapper.appendChild(img);
  });
};

const ensureWithinBounds = (piece) => {
  const areaRect = area.getBoundingClientRect();
  const rect = piece.getBoundingClientRect();
  const currentLeft = toNumber(piece.style.left);
  const currentTop = toNumber(piece.style.top);
  const maxX = Math.max(areaRect.width - rect.width, 0);
  const maxY = Math.max(areaRect.height - rect.height, 0);

  const left = clamp(currentLeft, 0, maxX);
  const top = clamp(currentTop, 0, maxY);

  piece.style.left = `${left}px`;
  piece.style.top = `${top}px`;
};

const randomPlacement = () => {
  const areaRect = area.getBoundingClientRect();
  pieces.forEach((piece, index) => {
    const rotation = Math.round((Math.random() * 60 - 30) / 5) * 5;

    rotations.set(piece.id, rotation);
    piece.style.transform = `rotate(${rotation}deg)`;

    const rect = piece.getBoundingClientRect();
    const maxX = Math.max(areaRect.width - rect.width, 0);
    const maxY = Math.max(areaRect.height - rect.height, 0);
    const left = Math.random() * maxX;
    const top = Math.random() * maxY;

    piece.style.left = `${left}px`;
    piece.style.top = `${top}px`;
    ensureWithinBounds(piece);
  });
  updateCoords();
};

const updateCoords = () => {
  if (!pieces.length) return;

  const firstPiece = pieces[0];
  const baseLeft = toNumber(firstPiece.style.left);
  const baseTop = toNumber(firstPiece.style.top);

  pieces_coords = pieces.map((piece, index) => {
    const left = toNumber(piece.style.left);
    const top = toNumber(piece.style.top);

    return {
      x: index === 0 ? 0 : Math.round(left - baseLeft),
      y: index === 0 ? 0 : Math.round(top - baseTop),
    };
  });
};

const isSolved = () => {
  return pieces_coords.every((coord, idx) => {
    const target = result_coords[idx];
    return (
      Math.abs(coord.x - target.x) <= ACCEPTABLE_ERROR &&
      Math.abs(coord.y - target.y) <= ACCEPTABLE_ERROR
    );
  });
};

const stopAnimation = () => {
  pieces.forEach((piece) => piece.classList.remove("animate"));
  restartButton.classList.remove("visible");
  isAnimating = false;
};

const startAnimation = () => {
  if (isAnimating) return;
  pieces.forEach((piece) => piece.classList.add("animate"));
  restartButton.classList.add("visible");
  isAnimating = true;
};

const handleMouseDown = (event, piece) => {
  if (isAnimating) return;
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = toNumber(piece.style.left);
  const startTop = toNumber(piece.style.top);

  dragState = { piece, startX, startY, startLeft, startTop };
  piece.style.boxShadow = "0 12px 25px rgba(0,0,0,0.25)";
};

const handleMouseMove = (event) => {
  if (!dragState) return;
  const { piece, startX, startY, startLeft, startTop } = dragState;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;

  const areaRect = area.getBoundingClientRect();
  const rect = piece.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  const newLeft = clamp(startLeft + dx, 0, Math.max(areaRect.width - width, 0));
  const newTop = clamp(startTop + dy, 0, Math.max(areaRect.height - height, 0));

  piece.style.left = `${newLeft}px`;
  piece.style.top = `${newTop}px`;
};

const handleMouseUp = () => {
  if (!dragState) return;
  ensureWithinBounds(dragState.piece);
  dragState.piece.style.boxShadow = "none";
  dragState = null;
  updateCoords();
  if (isSolved()) {
    startAnimation();
  }
};

const handleWheel = (event, piece) => {
  if (isAnimating) return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? 5 : -5;
  const current = rotations.get(piece.id) || 0;
  const next = current + delta;
  rotations.set(piece.id, next);
  piece.style.transform = `rotate(${next}deg)`;
  ensureWithinBounds(piece);

  // Координаты пересчитываются после вращения, чтобы упростить подбор result_coords.
  updateCoords();
  if (isSolved()) {
    startAnimation();
  }
};

const addDebugButton = () => {
  if (!DEBUG_MODE) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "print coords";
  btn.className = "debug-button";
  btn.addEventListener("click", () => {
    console.log("pieces_coords (для подбора result_coords):", pieces_coords);
  });
  area.appendChild(btn);
};

const resetPuzzle = () => {
  stopAnimation();
  rotations.clear();
  pieces.forEach((piece) => {
    piece.style.transform = "rotate(0deg)";
  });
  randomPlacement();
};

const init = async () => {
  const created = await Promise.all(puzzle_assets.map(createPiece));
  pieces = created;
  created.forEach((piece, index) => {
    area.appendChild(piece);

    piece.addEventListener("mousedown", (event) =>
      handleMouseDown(event, piece)
    );
    piece.addEventListener("wheel", (event) => handleWheel(event, piece));
    piece.addEventListener("dragstart", (e) => e.preventDefault());
  });

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  addDebugButton();
  randomPlacement();
};

restartButton.addEventListener("click", resetPuzzle);
init();
