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

// --- terminal --------------------------------------------------------------

(() => {
  const term = document.getElementById("terminal");
  const output = document.getElementById("terminalOutput");
  const form = document.getElementById("terminalForm");
  const input = document.getElementById("terminalInput");
  if (!term || !output || !form || !input) return;

  const commands = {
    help() {
      return [
        "available commands:",
        "  whoami      who is this guy",
        "  projects    featured builds",
        "  interests   stuff i love",
        "  skills      toolchain",
        "  contact     how to reach me",
        "  github      open my github profile",
        "  theme       toggle green / amber phosphor",
        "  reboot      restart the system",
        "  clear       wipe the screen",
      ];
    },
    whoami() {
      return ["omer — 18 y/o pcb designer & hardware tinkerer"];
    },
    projects() {
      return [
        "featured builds:",
        "  b2-stealth-fc   stm32 flight controller",
        "  macropex        rp2040 macropad",
        "  star-flight     rp2350 rocket computer",
        "  venoshock       usb-c variable psu",
        "  dk-32           batarang esp32 board",
        "  apex-1          f1 line-following robot",
        "  + 18 more on github",
      ];
    },
    interests() {
      return ["> pcb design", "> hardware", "> making leds blink"];
    },
    skills() {
      return ["easyeda pro · kicad · stm32cube · qmk · arduino", "c · python · 3d printing · soldering"];
    },
    contact() {
      return [
        "github: github.com/omruk5689-dev",
        "email:  best reached through github",
        "open to: pcb design, firmware, weird hardware ideas",
      ];
    },
    github() {
      window.open("https://github.com/omruk5689-dev", "_blank", "noopener");
      return ["opening github..."];
    },
    theme() {
      const amber = document.body.classList.toggle("theme-amber");
      document.body.classList.toggle("theme-green", !amber);
      return [`phosphor set to ${amber ? "amber" : "green"}`];
    },
    reboot() {
      if (typeof window.__omerBoot === "function") {
        output.textContent = "";
        window.__omerBoot();
        return [];
      }
      return ["reboot unavailable"];
    },
    sudo() {
      return ["nice try. this incident has been logged."];
    },
    matrix() {
      return ["wake up, omer... follow the white pcb."];
    },
    date() {
      return [new Date().toString()];
    },
    ls() {
      return ["projects/  about/  contact/  README.md  solder.hex"];
    },
    clear() {
      output.textContent = "";
      return [];
    },
  };

  const print = (text, variant) => {
    const line = document.createElement("p");
    line.className = "terminal__line" + (variant ? ` terminal__line--${variant}` : "");
    line.textContent = text;
    output.appendChild(line);
  };

  const scrollDown = () => {
    output.scrollTop = output.scrollHeight;
  };

  const run = (raw) => {
    const value = raw.trim();
    if (!value) return;

    print(`omer@lab:~$ ${value}`, "cmd");
    const [name] = value.toLowerCase().split(/\s+/);
    const handler = commands[name];

    if (handler) {
      const result = handler();
      result.forEach((line) => print(line, "accent"));
    } else {
      print(`command not found: ${name}. type "help".`, "err");
    }

    scrollDown();
  };

  const history = [];
  let cursor = -1;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value;
    if (value.trim()) {
      history.push(value.trim());
      cursor = history.length;
    }
    run(value);
    input.value = "";
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;
      cursor = Math.max(0, cursor - 1);
      input.value = history[cursor];
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!history.length) return;
      cursor = Math.min(history.length, cursor + 1);
      input.value = history[cursor] || "";
    }
  });

  term.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    input.focus({ preventScroll: true });
  });

  document.querySelectorAll("[data-cmd]").forEach((button) => {
    button.addEventListener("click", () => {
      run(button.dataset.cmd);
      input.focus({ preventScroll: true });
    });
  });

  scrollDown();
})();

// --- project filters -------------------------------------------------------

(() => {
  const buttons = Array.from(document.querySelectorAll(".filter[data-filter]"));
  const cards = Array.from(document.querySelectorAll(".project-card[data-category]"));
  const counter = document.getElementById("projectCount");
  if (!buttons.length || !cards.length) return;

  const total = cards.length;

  const applyFilter = (filter) => {
    let shown = 0;

    cards.forEach((card) => {
      const match = filter === "all" || card.dataset.category === filter;
      card.hidden = !match;
      card.classList.remove("is-entering");
      if (match) {
        shown += 1;
        // force reflow so the entry animation restarts on each filter change
        void card.offsetWidth;
        card.classList.add("is-entering");
      }
    });

    buttons.forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (counter) {
      counter.textContent = `SHOWING ${String(shown).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.filter));
  });

  applyFilter("all");
})();

// --- reboot button ---------------------------------------------------------

(() => {
  const btn = document.getElementById("rebootBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (typeof window.__omerBoot === "function") {
      window.__omerBoot();
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  });
})();

// --- UI controls (clock, progress, nav, menu, phosphor) --------------------

(() => {
  const body = document.body;
  const clock = document.getElementById("clock");
  const scrollBar = document.getElementById("scrollBar");
  const menuToggle = document.getElementById("menuToggle");
  const siteNav = document.getElementById("siteNav");
  const phosphorToggle = document.getElementById("phosphorToggle");

  if (clock) {
    const fmt = (value) => String(value).padStart(2, "0");
    const tick = () => {
      const now = new Date();
      clock.textContent = `${fmt(now.getHours())}:${fmt(now.getMinutes())}:${fmt(now.getSeconds())}`;
      clock.dateTime = now.toISOString();
    };
    tick();
    setInterval(tick, 1000);
  }

  if (scrollBar) {
    const updateProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      scrollBar.style.width = `${progress}%`;
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
  }

  if (menuToggle && siteNav) {
    const closeMenu = () => {
      siteNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open menu");
    };

    menuToggle.addEventListener("click", () => {
      const open = siteNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (event) => {
      if (!siteNav.classList.contains("is-open")) return;
      if (siteNav.contains(event.target) || menuToggle.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  const navLinks = Array.from(document.querySelectorAll('.site-nav__link[href^="#"]'));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (navLinks.length && sections.length && "IntersectionObserver" in window) {
    const byId = new Map(navLinks.map((link) => [link.getAttribute("href").slice(1), link]));
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => link.classList.remove("is-active"));
          const active = byId.get(entry.target.id);
          if (active) active.classList.add("is-active");
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0.01 }
    );
    sections.forEach((section) => navObserver.observe(section));
  }

  if (phosphorToggle) {
    const syncPhosphor = () => {
      const amber = body.classList.contains("theme-amber");
      phosphorToggle.textContent = amber ? "PHOS:AMB" : "PHOS:GRN";
      phosphorToggle.setAttribute("aria-pressed", String(amber));
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", amber ? "#130d05" : "#07130b");
    };

    phosphorToggle.addEventListener("click", () => {
      const amber = body.classList.toggle("theme-amber");
      body.classList.toggle("theme-green", !amber);
      syncPhosphor();
    });

    syncPhosphor();
  }
})();
