const box = document.getElementById("sanatorium");
const sun = document.getElementById("sun");
const fox = document.getElementById("fox");
const titleClick = document.getElementById("titleClick");

let mouseDownInside = false;

// Нажатие ЛКМ
box.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return; // только левая кнопка
  mouseDownInside = true;

  // Маркер для скрытия ховер-текста
  box.classList.add("mouse-down");

  // Солнце появляется и едет по дуге
  sun.classList.add("sun-active");

  // Меняем лису на fox_headup
  fox.src = "../assets/assignment2/fox_headup.png";

  // Показываем оранжевую надпись
  titleClick.style.opacity = "1";
});

// Обработка отжатия и ухода курсора
function handleMouseUp() {
  if (!mouseDownInside) return;
  mouseDownInside = false;

  // Снимаем маркер зажатия
  box.classList.remove("mouse-down");

  // Останавливаем солнце (оно снова станет с opacity:0)
  sun.classList.remove("sun-active");

  // Возвращаем обычную лису
  fox.src = "../assets/assignment2/fox.png";

  // Прячем оранжевую надпись
  titleClick.style.opacity = "0";

  // Тряска блока
  box.classList.add("shake");
  setTimeout(() => {
    box.classList.remove("shake");
  }, 3000);
}

box.addEventListener("mouseup", handleMouseUp);
box.addEventListener("mouseleave", handleMouseUp);
