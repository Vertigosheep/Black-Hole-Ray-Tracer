const NAV_LINKS = [
  { href: "index.html", label: "Home" },
  { href: "renderer.html", label: "1 · Renderer" },
  { href: "trajectories.html", label: "2 · Photon Paths" },
  { href: "mesh.html", label: "3 · Curvature Mesh" },
  { href: "lensing.html", label: "4 · Lensing" },
  { href: "animation.html", label: "5 · Ray Animation" },
  { href: "deflection.html", label: "6 · Deflection" },
  { href: "intensity.html", label: "7 · Intensity" },
  { href: "orbits.html", label: "8 · Orbits" },
  { href: "compare.html", label: "9 · Newton vs GR" },
  { href: "roadmap.html", label: "Roadmap" },
];

function renderNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  const root = document.getElementById("nav-root");
  if (!root) return;
  const links = NAV_LINKS.map(
    (l) =>
      `<a class="navlink${l.href === current ? " active" : ""}" href="${l.href}">${l.label}</a>`
  ).join("");
  root.innerHTML = `
    <nav class="topnav">
      <a class="brand" href="index.html">⬤ EVENT HORIZON</a>
      ${links}
    </nav>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderNav();
});

