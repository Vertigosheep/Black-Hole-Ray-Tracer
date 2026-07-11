const NAV_LINKS = [
  { href: "index.html", label: "Home" },
  { href: "renderer.html", label: "Renderer" },
  { href: "trajectories.html", label: "Photon Paths" },
  { href: "mesh.html", label: "Curvature Mesh" },
  { href: "lensing.html", label: "Lensing" },
  { href: "animation.html", label: "Ray Animation" },
  { href: "deflection.html", label: "Deflection" },
  { href: "intensity.html", label: "Intensity" },
  { href: "orbits.html", label: "Orbits" },
  { href: "compare.html", label: "Newton vs GR" },
  { href: "roadmap.html", label: "Roadmap" },
];

function renderNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  const root = document.getElementById("nav-root");
  if (!root) return;

  const links = NAV_LINKS.map((l, index) => {
    const idx = String(index + 1).padStart(2, "0");
    const cls = l.href === current ? " active" : "";
    return `<li class="sideline-nav-item"><a class="sideline-nav-link${cls}" href="${l.href}"><span class="sideline-nav-index">${idx}</span><span>${l.label}</span></a></li>`;
  }).join("");

  root.innerHTML = `
    <nav class="sideline-nav" id="sidebar-drawer">
      <a class="brand-title" href="index.html">⬤ EVENT HORIZON</a>
      <p class="sideline-nav-heading">Navigation</p>
      <ul class="sideline-nav-list" id="sideline-list">
        ${links}
      </ul>
    </nav>
  `;

  // --- Cursor proximity effect on nav items ---
  const list = document.getElementById("sideline-list");
  if (!list) return;

  const RADIUS = 120;
  const items = list.querySelectorAll(".sideline-nav-item");

  list.addEventListener("pointermove", (e) => {
    const listRect = list.getBoundingClientRect();
    const pointerY = e.clientY - listRect.top;

    items.forEach((item) => {
      const center = item.offsetTop + item.offsetHeight / 2;
      const dist = Math.abs(pointerY - center);
      const raw = Math.max(0, 1 - dist / RADIUS);
      const prox = raw * raw * (3 - 2 * raw); // smoothstep
      item.style.setProperty("--prox", prox.toFixed(3));
    });
  });

  list.addEventListener("pointerleave", () => {
    items.forEach((item) => item.style.setProperty("--prox", "0"));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Inject Neuton font
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Neuton:ital,wght@0,300;0,400;0,700;1,400&display=swap";
  document.head.appendChild(link);

  renderNav();
});
