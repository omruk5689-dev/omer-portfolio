"use strict";

(() => {
  const boot = document.getElementById("boot");
  if (!boot) return;

  const body = document.body;
  const skipBtn = document.getElementById("bootSkip");
  const logLines = Array.from(boot.querySelectorAll("[data-boot-line]"));
  const bar = document.getElementById("bootBar");
  const pct = document.getElementById("bootPct");
  const hint = document.getElementById("bootHint");
  const press = document.getElementById("bootPress");
  const inertTargets = Array.from(document.querySelectorAll(".skip-link, .site-header, main, footer"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let timers = [];
  let progressTimer = null;
  let autoTimer = null;
  let ready = false;
  let active = false;

  function clearTimers() {
    timers.forEach((timer) => clearTimeout(timer));
    timers = [];
    clearInterval(progressTimer);
    clearTimeout(autoTimer);
    progressTimer = null;
    autoTimer = null;
  }

  function setInert(on) {
    inertTargets.forEach((element) => {
      if (on) element.setAttribute("inert", "");
      else element.removeAttribute("inert");
    });
  }

  function setProgress(value) {
    bar.style.width = `${value}%`;
    pct.textContent = `${value}%`;
  }

  function markReady() {
    ready = true;
    hint.hidden = true;
    press.hidden = false;
    try {
      sessionStorage.setItem("omer-booted", "1");
    } catch (error) {
      /* storage can be unavailable on file:// */
    }
    autoTimer = setTimeout(enter, reducedMotion ? 700 : 1800);
  }

  function startBoot() {
    clearTimers();
    active = true;
    ready = false;
    boot.hidden = false;
    boot.classList.remove("is-off");
    body.classList.add("is-booting");
    setInert(true);
    logLines.forEach((line) => line.classList.remove("is-on"));
    setProgress(0);
    hint.hidden = false;
    press.hidden = true;
    if (skipBtn) skipBtn.focus({ preventScroll: true });

    const lineDelay = reducedMotion ? 30 : 150;
    logLines.forEach((line, index) => {
      timers.push(setTimeout(() => line.classList.add("is-on"), index * lineDelay + 80));
    });

    const start = performance.now();
    const duration = reducedMotion ? 400 : 2100;
    progressTimer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      setProgress(Math.round(progress * 100));
      if (progress >= 1) {
        clearInterval(progressTimer);
        progressTimer = null;
        markReady();
      }
    }, 50);
  }

  function enter() {
    if (!active) return;
    active = false;
    clearTimers();
    ready = false;
    try {
      sessionStorage.setItem("omer-booted", "1");
    } catch (error) {
      /* ignore */
    }
    boot.classList.add("is-off");
    timers.push(
      setTimeout(() => {
        boot.hidden = true;
        boot.classList.remove("is-off");
        body.classList.remove("is-booting");
        setInert(false);
        const main = document.getElementById("main");
        if (main) main.focus({ preventScroll: true });
      }, reducedMotion ? 30 : 560)
    );
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      enter();
    });
  }

  boot.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    if (ready) enter();
  });

  document.addEventListener("keydown", (event) => {
    if (!active || event.key === "Tab") return;
    if (event.key === "Escape" || ready) {
      event.preventDefault();
      enter();
    }
  });

  window.__omerBoot = startBoot;

  if (document.documentElement.classList.contains("boot-skip")) {
    boot.hidden = true;
    body.classList.remove("is-booting");
    setInert(false);
    return;
  }

  startBoot();
})();

// --- reveal on scroll ------------------------------------------------------

(() => {
  const items = Array.from(document.querySelectorAll(".reveal"));
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.01, rootMargin: "0px 0px -40px 0px" }
  );

  const revealVisible = () => {
    const viewport = window.innerHeight;
    items.forEach((item) => {
      if (item.classList.contains("is-visible")) return;
      const rect = item.getBoundingClientRect();
      if (rect.top < viewport - 40 && rect.bottom > 0) {
        item.classList.add("is-visible");
        observer.unobserve(item);
      }
    });
  };

  items.forEach((item) => observer.observe(item));
  window.addEventListener("load", revealVisible);
  window.addEventListener("resize", revealVisible);
  setTimeout(revealVisible, 400);
})();
