const SPRITE_PATH = "assets/icons/lucide-sprite.svg";

export function hydrateIcons(root = document) {
  const placeholders = root.querySelectorAll("[data-icon]:not([data-icon-ready])");

  for (const placeholder of placeholders) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    svg.classList.add("icon");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    use.setAttribute("href", `${SPRITE_PATH}#icon-${placeholder.dataset.icon}`);
    svg.append(use);
    placeholder.replaceChildren(svg);
    placeholder.dataset.iconReady = "true";
  }
}
