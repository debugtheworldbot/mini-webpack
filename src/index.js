import helloWorld from "./world";

const helloWorldStr = helloWorld();

function component() {
  const element = document.createElement("div");

  element.innerHTML = helloWorldStr;

  return element;
}

document.body.appendChild(component());
