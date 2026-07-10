(function () {
  "use strict";

  function updateScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    document.documentElement.style.setProperty("--scroll-y", scrollY + "px");
    
    // Move any element with a data-parallax-speed attribute
    const elements = document.querySelectorAll("[data-parallax-speed]");
    elements.forEach(el => {
      const speed = parseFloat(el.getAttribute("data-parallax-speed")) || 0;
      const yOffset = scrollY * speed;
      el.style.transform = `translateY(${yOffset}px)`;
    });
  }

  // Use requestAnimationFrame to throttle scroll updates for maximum smoothness
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener("resize", updateScroll);

  // Programmatically assign parallax speeds to elements on all pages
  function setupParallaxElements() {
    const heroH1 = document.querySelector(".hero h1");
    if (heroH1) heroH1.setAttribute("data-parallax-speed", "-0.14");

    const heroLead = document.querySelector(".hero p.lead");
    if (heroLead) heroLead.setAttribute("data-parallax-speed", "-0.08");

    const heroCta = document.querySelector(".hero .cta-row");
    if (heroCta) heroCta.setAttribute("data-parallax-speed", "-0.1");

    const heroCanvas = document.querySelector(".hero-canvas-wrap");
    if (heroCanvas) heroCanvas.setAttribute("data-parallax-speed", "0.04");

    const titles = document.querySelectorAll(".section-title");
    titles.forEach(el => el.setAttribute("data-parallax-speed", "-0.05"));

    const panels = document.querySelectorAll(".panel");
    panels.forEach((el, index) => {
      // Alternate speeds slightly to create organic layered depth
      const speed = -0.02 - (index % 3) * 0.02;
      el.setAttribute("data-parallax-speed", speed.toString());
    });

    const canvasWraps = document.querySelectorAll(".canvas-wrap");
    canvasWraps.forEach(el => el.setAttribute("data-parallax-speed", "0.03"));

    // Run initial update
    updateScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupParallaxElements);
  } else {
    setupParallaxElements();
  }
})();
