"use strict";

/* ==========================================================================
   OMERCRAFT — enhancement layer
   Sound, achievements, HUD, sky, particles, creeper, and crafting recipes.
   ========================================================================== */

(() => {
  const body = document.body;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        /* storage can be unavailable */
      }
    },
    getJSON(key) {
      try {
        return JSON.parse(localStorage.getItem(key) || "[]");
      } catch (error) {
        return [];
      }
    },
    setJSON(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        /* ignore */
      }
    },
  };

  /* ------------------------------------------------------------------------
     Sound engine
     ------------------------------------------------------------------------ */

  let audioCtx = null;
  let soundOn = store.get("omer-sound") === "on";

  function ensureAudio() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone({ freq = 440, dur = 0.06, type = "square", gain = 0.025, slide = 0, delay = 0 } = {}) {
    if (!soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), start + dur);

    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  let lastClick = 0;
  function clickSound() {
    if (!soundOn) return;
    const now = performance.now();
    if (now - lastClick < 45) return;
    lastClick = now;
    tone({ freq: 540, dur: 0.035, type: "square", gain: 0.018 });
    tone({ freq: 760, dur: 0.03, type: "square", gain: 0.012, delay: 0.025 });
  }

  function achievementSound() {
    if (!soundOn) return;
    tone({ freq: 660, dur: 0.09, type: "square", gain: 0.022 });
    tone({ freq: 880, dur: 0.09, type: "square", gain: 0.022, delay: 0.1 });
    tone({ freq: 1320, dur: 0.14, type: "square", gain: 0.018, delay: 0.2 });
  }

  function explosionSound() {
    if (!soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;

    const duration = 0.55;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const decay = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * decay * decay;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + duration);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.12, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    noise.connect(filter).connect(amp).connect(ctx.destination);
    noise.start();

    tone({ freq: 120, dur: 0.42, type: "sawtooth", gain: 0.06, slide: -70 });
  }

  const soundToggle = $("#soundToggle");

  function syncSound() {
    if (soundToggle) {
      soundToggle.textContent = soundOn ? "SND:ON" : "SND:OFF";
      soundToggle.setAttribute("aria-pressed", String(soundOn));
      soundToggle.setAttribute("aria-label", soundOn ? "Turn interface sound off" : "Turn interface sound on");
    }
    const hudSound = $("#hudSound");
    if (hudSound) {
      hudSound.setAttribute("aria-pressed", String(soundOn));
      hudSound.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
    }
  }

  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      soundOn = !soundOn;
      store.set("omer-sound", soundOn ? "on" : "off");
      syncSound();
      if (soundOn) {
        ensureAudio();
        achievementSound();
        achievement("sound", "Now Playing", "The soundtrack of the blocky world is on.", "🔊");
      } else {
        tone({ freq: 220, dur: 0.08, type: "square", gain: 0.02 });
      }
    });
  }

  syncSound();

  document.addEventListener(
    "click",
    (event) => {
      if (!soundOn) return;
      if (event.target.closest("a, button")) clickSound();
    },
    true
  );

  /* ------------------------------------------------------------------------
     Achievements
     ------------------------------------------------------------------------ */

  const toastLayer = $("#mcToasts");
  const seenAchievements = new Set(store.getJSON("omer-achievements"));
  const toastQueue = [];
  let toastActive = false;

  function achievement(id, title, desc, icon = "🏆") {
    if (!toastLayer || seenAchievements.has(id)) return;
    seenAchievements.add(id);
    store.setJSON("omer-achievements", Array.from(seenAchievements));
    toastQueue.push({ title, desc, icon });
    pumpToasts();
  }

  function pumpToasts() {
    if (toastActive || !toastQueue.length || !toastLayer) return;
    toastActive = true;

    const item = toastQueue.shift();
    const toast = document.createElement("div");
    toast.className = "mc-toast";
    toast.setAttribute("role", "status");

    const icon = document.createElement("div");
    icon.className = "mc-toast__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = item.icon;

    const bodyEl = document.createElement("div");
    bodyEl.className = "mc-toast__body";

    const kicker = document.createElement("p");
    kicker.className = "mc-toast__kicker";
    kicker.textContent = "ACHIEVEMENT GET!";

    const title = document.createElement("p");
    title.className = "mc-toast__title";
    title.textContent = item.title;

    const desc = document.createElement("p");
    desc.className = "mc-toast__desc";
    desc.textContent = item.desc;

    bodyEl.append(kicker, title, desc);
    toast.append(icon, bodyEl);
    toastLayer.appendChild(toast);

    achievementSound();

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      toast.classList.add("is-out");
      window.setTimeout(() => {
        toast.remove();
        toastActive = false;
        pumpToasts();
      }, reduced ? 30 : 320);
    };

    toast.addEventListener("click", close);
    window.setTimeout(close, 4600);
  }

  /* ------------------------------------------------------------------------
     Block particles + creeper explosion
     ------------------------------------------------------------------------ */

  const burstLayer = $("#mcBurstLayer");
  const burstPalette = ["#55c233", "#8ef06a", "#79553a", "#4deeea", "#f7c948", "#ffffff"];

  function burst(x, y, colors = burstPalette, count = 8, power = 1) {
    if (!burstLayer || reduced) return;

    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement("span");
      particle.className = "mc-burst";
      const angle = Math.random() * Math.PI * 2;
      const distance = (18 + Math.random() * 54) * power;

      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.background = colors[i % colors.length];
      particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * distance + 14}px`);
      particle.style.animationDelay = `${Math.random() * 60}ms`;
      particle.style.width = `${5 + Math.floor(Math.random() * 4)}px`;
      particle.style.height = particle.style.width;

      burstLayer.appendChild(particle);
      window.setTimeout(() => particle.remove(), 850);
    }
  }

  const flash = $("#mcFlash");
  const creeper = $(".mc-char--creeper");

  function detonate() {
    if (!creeper) return;

    const rect = creeper.getBoundingClientRect();
    creeper.classList.add("is-exploding");
    if (flash) {
      flash.classList.remove("is-on");
      void flash.offsetWidth;
      flash.classList.add("is-on");
    }

    burst(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      ["#58b848", "#4fa840", "#8ef06a", "#1f2d1a", "#ffffff"],
      28,
      1.7
    );
    explosionSound();
    achievement("creeper", "Don't Look Back", "You poked the creeper. It poked back.", "💥");

    window.setTimeout(() => {
      creeper.classList.remove("is-exploding");
      if (flash) flash.classList.remove("is-on");
    }, 750);
  }

  if (creeper) {
    creeper.addEventListener("click", (event) => {
      event.stopPropagation();
      detonate();
    });
  }

  document.addEventListener("click", (event) => {
    if (reduced) return;
    if (body.classList.contains("is-booting")) return;
    if (event.target.closest("a, button, input, textarea, select, label, .boot, .mc-hud, .terminal, .mc-toast")) return;
    burst(event.clientX, event.clientY, burstPalette, 7, 0.9);
  });

  /* ------------------------------------------------------------------------
     HUD: hearts, hunger, XP, active section, quick controls
     ------------------------------------------------------------------------ */

  const hearts = $("#mcHearts");
  const hunger = $("#mcHunger");

  if (hearts) {
    for (let i = 0; i < 10; i += 1) {
      const heart = document.createElement("span");
      heart.className = "mc-heart";
      heart.innerHTML = '<svg aria-hidden="true"><use href="#i-heart"></use></svg>';
      hearts.appendChild(heart);
    }
  }

  if (hunger) {
    for (let i = 0; i < 10; i += 1) {
      const drumstick = document.createElement("i");
      drumstick.innerHTML = '<svg aria-hidden="true"><use href="#i-hunger"></use></svg>';
      hunger.appendChild(drumstick);
    }
  }

  const xpFill = $("#mcXpFill");
  const xpLevel = $("#mcXpLevel");

  function updateXp() {
    if (!xpFill || !xpLevel) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
    xpFill.style.width = `${(progress * 100).toFixed(1)}%`;
    xpLevel.textContent = String(18 + Math.round(progress * 24));
  }

  if (xpFill) {
    let xpFrame = null;
    window.addEventListener(
      "scroll",
      () => {
        if (xpFrame) return;
        xpFrame = requestAnimationFrame(() => {
          xpFrame = null;
          updateXp();
        });
      },
      { passive: true }
    );
    window.addEventListener("resize", updateXp);
    updateXp();
  }

  const hudTheme = $("#hudTheme");
  if (hudTheme) {
    hudTheme.addEventListener("click", () => {
      const toggle = $("#phosphorToggle");
      if (toggle) toggle.click();
    });
  }

  const hudSound = $("#hudSound");
  if (hudSound) {
    hudSound.addEventListener("click", () => {
      if (soundToggle) soundToggle.click();
    });
  }

  const hudCreeper = $("#hudCreeper");
  if (hudCreeper) {
    hudCreeper.addEventListener("click", detonate);
  }

  const sectionLinks = $$(".mc-slot[data-section]");
  if (sectionLinks.length && "IntersectionObserver" in window) {
    const linkById = new Map(sectionLinks.map((link) => [link.dataset.section, link]));
    const sectionIds = Array.from(linkById.keys());
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          sectionLinks.forEach((link) => link.classList.remove("is-active"));
          const active = linkById.get(entry.target.id);
          if (active) active.classList.add("is-active");
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0.01 }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* ------------------------------------------------------------------------
     Sky stars
     ------------------------------------------------------------------------ */

  const starLayer = $("#mcStars");
  if (starLayer) {
    for (let i = 0; i < 34; i += 1) {
      const star = document.createElement("span");
      star.className = `mc-star${i % 7 === 0 ? " mc-star--big" : ""}`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 55}%`;
      star.style.animationDelay = `${(Math.random() * 4).toFixed(2)}s`;
      star.style.animationDuration = `${(2.4 + Math.random() * 3.2).toFixed(2)}s`;
      starLayer.appendChild(star);
    }
  }

  /* ------------------------------------------------------------------------
     Crafting table
     ------------------------------------------------------------------------ */

  const recipes = {
    flight: {
      title: "B2-STEALTH FC",
      desc: "A custom STM32F722 flight controller for RC fixed-wing planes, with an ICM-20689 IMU and DJI O4 support.",
      tags: ["STM32F722", "ICM-20689", "DJI O4"],
      link: "https://github.com/omruk5689-dev/B2-stealth-FC",
      icon: "✈️",
      items: [
        ["🧠", "STM32F722"], ["🧭", "ICM-20689"], ["📡", "DJI O4"],
        ["⚡", "5V REG"], ["🔋", "XT30"], ["💾", "BLACKBOX"],
        ["📶", "OSD"], ["🔘", "BOOT"], ["🧱", "PCB"],
      ],
    },
    macro: {
      title: "MACROPeX",
      desc: "An open-source RP2040 macropad with a hand-drawn PCB, QMK firmware, and a 3D-printed case.",
      tags: ["RP2040", "QMK", "EASYEDA"],
      link: "https://github.com/omruk5689-dev/MACROPeX",
      icon: "⌨️",
      items: [
        ["🧠", "RP2040"], ["🔘", "SWITCHES"], ["🎛️", "ENCODER"],
        ["🖥️", "OLED"], ["💾", "QMK"], ["🔌", "USB-C"],
        ["🧩", "DIODES"], ["🧱", "PCB"], ["📦", "CASE"],
      ],
    },
    dev: {
      title: "PIXO",
      desc: "An ATmega328P Arduino-compatible board with onboard USB-C, a CH340, and breadboard-friendly pins.",
      tags: ["ATMEGA328P", "CH340", "ARDUINO"],
      link: "https://github.com/omruk5689-dev/PIXO",
      icon: "🔌",
      items: [
        ["🧠", "ATMEGA328P"], ["🔌", "USB-C"], ["💾", "CH340"],
        ["⚡", "LDO"], ["🔘", "RESET"], ["💡", "LEDS"],
        ["📶", "HEADERS"], ["🧩", "CRYSTAL"], ["🧱", "PCB"],
      ],
    },
    nfc: {
      title: "COMMIT-CARD",
      desc: "A tiny NFC card PCB that opens my GitHub profile when you tap it with your phone.",
      tags: ["NFC", "PCB", "FUN"],
      link: "https://github.com/omruk5689-dev/COMMIT-CARD",
      icon: "💳",
      items: [
        ["🏷️", "NTAG213"], ["📡", "ANTENNA"], ["🧱", "PCB"],
        ["💡", "LED"], ["⚡", "CAP"], ["🔘", "TAP"],
        ["🧩", "TRACES"], ["✨", "ENAMEL"], ["🎁", "FUN"],
      ],
    },
  };

  const craftGrid = $("#craftGrid");

  if (craftGrid) {
    const tabs = $$(".craft__tab[data-recipe]");
    const output = $("#craftOutput");
    const outputIcon = $("#craftOutputIcon");
    const outputName = $("#craftOutputName");
    const craftTitle = $("#craftTitle");
    const craftDesc = $("#craftDesc");
    const craftTags = $("#craftTags");
    const craftLink = $("#craftLink");
    let recipeSwitches = 0;

    const renderRecipe = (key, animate) => {
      const recipe = recipes[key];
      if (!recipe) return;

      tabs.forEach((tab) => {
        const active = tab.dataset.recipe === key;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });

      craftGrid.replaceChildren();
      recipe.items.forEach(([icon, label], index) => {
        const slot = document.createElement("div");
        slot.className = "craft__slot";
        slot.setAttribute("role", "gridcell");
        slot.setAttribute("aria-label", label);
        slot.title = label;
        slot.style.setProperty("--i", String(index));

        const iconEl = document.createElement("span");
        iconEl.setAttribute("aria-hidden", "true");
        iconEl.textContent = icon;

        const nameEl = document.createElement("small");
        nameEl.textContent = label;

        slot.append(iconEl, nameEl);
        craftGrid.appendChild(slot);
      });

      if (output) {
        output.href = recipe.link;
        output.setAttribute("aria-label", `Open ${recipe.title} on GitHub`);
      }
      if (outputIcon) outputIcon.textContent = recipe.icon;
      if (outputName) outputName.textContent = recipe.title;
      if (craftTitle) craftTitle.textContent = recipe.title;
      if (craftDesc) craftDesc.textContent = recipe.desc;
      if (craftTags) {
        craftTags.replaceChildren();
        recipe.tags.forEach((tag) => {
          const li = document.createElement("li");
          li.textContent = tag;
          craftTags.appendChild(li);
        });
      }
      if (craftLink) {
        craftLink.href = recipe.link;
        craftLink.setAttribute("aria-label", `Open ${recipe.title} on GitHub`);
      }

      if (animate && output) {
        const rect = output.getBoundingClientRect();
        burst(rect.left + rect.width / 2, rect.top + rect.height / 2, ["#8ef06a", "#55c233", "#f7c948", "#ffffff"], 12, 1);
      }
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        renderRecipe(tab.dataset.recipe, true);
        recipeSwitches += 1;
        if (recipeSwitches >= 2) {
          achievement("recipes", "Recipe Book", "You inspected multiple crafting recipes.", "📖");
        }
      });
    });

    tabs.forEach((tab, index) => {
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        next.focus();
        next.click();
      });
    });

    renderRecipe("flight", false);
  }

  /* ------------------------------------------------------------------------
     Contextual achievements
     ------------------------------------------------------------------------ */

  const sectionAchievements = [
    ["projects", "Bench Boss", "You opened the build archive.", "🛠️"],
    ["craft", "Crafting Table", "You inspected the parts behind the builds.", "🧱"],
    ["about", "Bookworm", "You read the story behind the boards.", "📖"],
    ["contact", "Open for Business", "You found the signal tower.", "📡"],
  ];

  if ("IntersectionObserver" in window) {
    const seenSections = new Set();
    const achievementObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const config = sectionAchievements.find(([id]) => id === entry.target.id);
          if (!config || seenSections.has(config[0])) return;
          seenSections.add(config[0]);
          achievement(...config);
        });
      },
      { threshold: 0.01, rootMargin: "-30% 0px -40% 0px" }
    );

    sectionAchievements.forEach(([id]) => {
      const section = document.getElementById(id);
      if (section) achievementObserver.observe(section);
    });
  }

  $$(".filter[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      achievement("filter", "Chest Sorter", "You sorted the project chests.", "📦");
    });
  });

  const terminalForm = $("#terminalForm");
  if (terminalForm) {
    terminalForm.addEventListener("submit", () => {
      achievement("terminal", "Command Line Crafter", "You spoke to the lab terminal.", "⌨️");
    });
  }

  let wasNight = body.classList.contains("theme-purple");
  const themeObserver = new MutationObserver(() => {
    const isNight = body.classList.contains("theme-purple");
    if (isNight === wasNight) return;
    wasNight = isNight;
    achievement("theme", "Weather Control", "You changed the world from day to night.", "🌗");
  });
  themeObserver.observe(body, { attributes: true, attributeFilter: ["class"] });

  /* ------------------------------------------------------------------------
     Welcome achievement after boot
     ------------------------------------------------------------------------ */

  let welcomed = false;
  const welcome = () => {
    if (welcomed) return;
    welcomed = true;
    achievement("welcome", "Taking Inventory", "Welcome to OMERCRAFT. Explore the world.", "🎒");
  };

  document.addEventListener("omer:entered", () => {
    window.setTimeout(welcome, 1200);
  });

  if (!body.classList.contains("is-booting")) {
    window.setTimeout(welcome, 1600);
  }
})();
