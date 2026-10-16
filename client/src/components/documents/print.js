export function printDocument(orientation = "portrait") {
  const style = document.createElement("style");
  style.textContent = `@page { size: A4 ${orientation}; margin: 10mm; }`;
  document.head.appendChild(style);
  document.body.classList.add("printing-doc");
  const done = () => {
    document.body.classList.remove("printing-doc");
    style.remove();
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}
