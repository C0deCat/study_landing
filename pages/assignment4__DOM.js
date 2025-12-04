const latinPhrases = [
  "Consuetudo est altera natura",
  "Nota bene",
  "Nulla calamitas sola",
  "Per aspera ad astra",
  "Sapere aude",
  "Aqua vitae",
  "Acta non verba",
  "Tempus fugit",
];

const russianTranslations = [
  "Привычка - вторая натура",
  "Заметьте хорошо!",
  "Беда не приходит одна",
  "Через тернии к звёздам",
  "Осмелься знать",
  "Живая вода",
  "Дела, не слова",
  "Время летит",
];

const randContainer = document.getElementById("rand");
const createButton = document.getElementById("createPhrase");

let clicks = 0;

const getRandomIndex = () => Math.floor(Math.random() * latinPhrases.length);

createButton.addEventListener("click", () => {
  const pairIndex = getRandomIndex();
  const paragraph = document.createElement("p");
  const appliedClass = clicks % 2 ? "class1" : "class2";

  paragraph.classList.add(appliedClass);
  paragraph.innerHTML = `<u>n=${clicks}</u> <i>"${latinPhrases[pairIndex]}"</i> "${russianTranslations[pairIndex]}"`;

  randContainer.appendChild(paragraph);

  clicks += 1;
});
