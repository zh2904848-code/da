const stage = document.querySelector("#stage");
const stageShell = document.querySelector(".stage-shell");
const shown = new Set();
let activeAction = null;
let sequenceTimers = [];
let currentAudio = null;
let actionAudio = null;
let backgroundAudio = null;
let backgroundStarted = false;
const backgroundVolume = 0.05;
const duckedBackgroundVolume = 0.015;

function lockViewportHeight() {
  const height = window.visualViewport?.height || window.innerHeight;
  if (height) {
    document.documentElement.style.setProperty("--viewport-h", `${Math.round(height)}px`);
  }
}
lockViewportHeight();

const revealMap = {
  "bubble-xiaohong": {
    body: [".bubble-xiaohong-bg"],
    stop: [".char-xiaohong", ".char-xiaohong-2"],
  },
  "bubble-right": {
    body: [".bubble-right-bg"],
    stop: [".char-girl-short-hair", ".char-girl-ponytail"],
  },
  "bubble-boy": {
    body: [".bubble-boy-bg"],
    stop: [".char-girl-sitting"],
  },
  "new-image": {
    body: [".reveal-new"],
    stop: [".reveal-new"],
  },
  bag: {
    body: [".reveal-bag"],
    stop: [".prop-backpack-gray"],
  },
  phone: {
    body: [".ui-phone-chat"],
    stop: [".char-boy-sitting"],
  },
  panel: {
    body: [".ui-panel-question-text"],
    stop: [".prop-calendar"],
  },
  scroll: {
    body: [".scroll-opened"],
    stop: [".scroll-opened"],
  },
  erase: {
    body: [".effect-mist", ".effect-hands", ".base-doodle"],
    stop: [".effect-mist", ".effect-hands", ".base-doodle"],
  },
  summary: {
    body: [".summary-1"],
    stop: [".summary-1"],
  },
};

const flowOrder = [
  "bubble-xiaohong",
  "bubble-right",
  "bubble-boy",
  "new-image",
  "bag",
  "phone",
  "scroll",
  "erase",
];

const bubbleRightSequence = [
  ".bubble-right-step-1",
  ".bubble-right-step-2",
  ".bubble-right-step-3",
  ".bubble-right-step-4",
  ".bubble-right-step-5",
  ".bubble-right-step-6",
  ".bubble-right-step-7",
  ".bubble-right-step-8",
  ".bubble-right-step-9",
];

const bubbleXiaohongSequence = [
  ".bubble-xiaohong-step-10",
  ".bubble-xiaohong-step-11",
  ".bubble-xiaohong-step-12",
  ".bubble-xiaohong-step-13",
  ".bubble-xiaohong-step-14",
  ".bubble-xiaohong-step-15",
  ".bubble-xiaohong-step-16",
  ".bubble-xiaohong-step-17",
  ".bubble-xiaohong-step-18",
  ".bubble-xiaohong-step-19",
  ".bubble-xiaohong-step-20",
];

const bubbleBoySequence = [
  ".bubble-boy-step-21",
  ".bubble-boy-step-22",
  ".bubble-boy-step-23",
  ".bubble-boy-step-24",
  ".bubble-boy-step-25",
  ".bubble-boy-step-26",
  ".bubble-boy-step-27",
  ".bubble-boy-step-28",
  ".bubble-boy-step-29",
  ".bubble-boy-step-30",
  ".bubble-boy-step-31",
  ".bubble-boy-step-32",
  ".bubble-boy-step-33",
  ".bubble-boy-step-34",
  ".bubble-boy-step-35",
  ".bubble-boy-step-36",
  ".bubble-boy-step-37",
  ".bubble-boy-step-38",
];

const audioFileMap = {
  "bubble-right": "voice-help.mp3",
  "bubble-xiaohong": "voice-why.mp3",
  "bubble-boy": "voice-blame.mp3",
};
const preloadedActionAudios = [];

function centerPortraitStage() {
  if (!stageShell) return;
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  if (!isPortrait || stageShell.scrollWidth <= stageShell.clientWidth) return;
  stageShell.scrollLeft = (stageShell.scrollWidth - stageShell.clientWidth) / 2;
}

function ensureBackgroundAudio() {
  if (backgroundAudio) return backgroundAudio;
  const audio = new Audio(encodeURI("./23/背景音乐2.mp3"));
  audio.preload = "none";
  audio.loop = true;
  audio.volume = backgroundVolume;
  backgroundAudio = audio;
  return audio;
}

function ensureActionAudio() {
  if (actionAudio) return actionAudio;
  const audio = new Audio();
  audio.preload = "auto";
  audio.disableRemotePlayback = true;
  actionAudio = audio;
  return audio;
}

function warmImageElement(img) {
  if (!img || !img.src) return;
  if (img.complete && img.decode) {
    img.decode().catch(() => {});
    return;
  }
  img.addEventListener("load", () => {
    img.decode?.().catch(() => {});
  }, { once: true });
}

function warmInteractiveAudios() {
  Object.values(audioFileMap).forEach((fileName) => {
    const audio = new Audio(encodeURI(`./23/${fileName}`));
    audio.preload = "auto";
    audio.load();
    preloadedActionAudios.push(audio);
  });
}

function preloadInteractiveAssets() {
  warmInteractiveAudios();
}

function warmIdleImages() {
  [
    ".char-xiaohong-2",
    ".char-observer",
    ".prop-backpack-gray",
    ".base-doodle",
    ".scroll-closed",
  ].forEach((sel) => loadLazyImage(document.querySelector(sel)));
}

function loadLazyImage(el) {
  if (!el || !el.dataset?.src || el.src) return;
  el.src = el.dataset.src;
  warmImageElement(el);
}

function startBackgroundAudio() {
  if (backgroundStarted) return;
  const audio = ensureBackgroundAudio();
  audio.play().then(() => {
    backgroundStarted = true;
  }).catch(() => {
    backgroundStarted = false;
  });
}

function setBackgroundVolume(volume) {
  if (!backgroundAudio) return;
  backgroundAudio.volume = volume;
}

function show(sel) {
  const el = document.querySelector(sel);
  if (el) {
    loadLazyImage(el);
    el.classList.add("is-visible");
  }
}

function stopMotion(sel) {
  const el = document.querySelector(sel);
  if (el) el.classList.add("is-frozen");
}

function pulse(btn) {
  btn.classList.remove("is-pulsed");
  void btn.offsetWidth;
  btn.classList.add("is-pulsed");
}

function flashHotspot(action) {
  document.querySelectorAll(".hotspot").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.action === action);
  });
}

function flashLayer(sel) {
  const el = document.querySelector(sel);
  if (!el) return;
  el.classList.remove("is-visible");
  void el.offsetWidth;
  el.classList.add("is-visible");
}

function clearSequenceTimers() {
  sequenceTimers.forEach((timerId) => window.clearTimeout(timerId));
  sequenceTimers = [];
}

function playImageSequence(selectors, stepDelay = 110) {
  clearSequenceTimers();
  selectors.forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.classList.remove("is-visible");
  });
  selectors.forEach((sel, index) => {
    const timerId = window.setTimeout(() => show(sel), index * stepDelay);
    sequenceTimers.push(timerId);
  });
}

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }
  setBackgroundVolume(backgroundVolume);
}

function playActionAudio(action) {
  stopCurrentAudio();
  const fileName = audioFileMap[action];
  if (!fileName) return;
  const audio = ensureActionAudio();
  audio.src = encodeURI(`./23/${fileName}`);
  currentAudio = audio;
  setBackgroundVolume(duckedBackgroundVolume);
  audio.onended = () => {
    if (currentAudio === audio) {
      currentAudio = null;
      audio.removeAttribute("src");
      audio.load();
      setBackgroundVolume(backgroundVolume);
    }
  };
  audio.play().catch(() => {
    if (currentAudio === audio) {
      currentAudio = null;
      setBackgroundVolume(backgroundVolume);
    }
  });
}

function updateClueCounter() {
  const foundCount = shown.size;
  const totalCount = flowOrder.length;
  const leftCount = totalCount - foundCount;
  
  const foundEl = document.getElementById("found-count");
  const leftEl = document.getElementById("left-count");
  const counterEl = document.getElementById("clue-counter");
  const btnSummary = document.getElementById("btn-summary");
  
  if (foundEl) foundEl.textContent = foundCount;
  if (leftEl) leftEl.textContent = leftCount;
  
  // Hide counter and show summary button when all clues are found
  if (foundCount >= totalCount) {
    if (counterEl) counterEl.style.opacity = "0";
    if (btnSummary) {
      btnSummary.style.display = "flex";
      // Allow a tiny delay for display:block to take effect before animating opacity if needed
      window.setTimeout(() => btnSummary.style.opacity = "1", 50);
    }
  }
}

function trigger(action) {
  if (activeAction === action) {
    closePopups();
    return;
  }
  const item = revealMap[action];
  if (!item) return;
  item.stop?.forEach((sel) => loadLazyImage(document.querySelector(sel)));
  if (!shown.has(action)) {
    shown.add(action);
    updateClueCounter();
  }
  activeAction = action;
  flashHotspot(action);
  
  // Hide hotspots only for specific fullscreen/popup
  const fullscreenActions = ["new-image", "bag", "phone", "erase"];
  if (fullscreenActions.includes(action)) {
    document.querySelectorAll(".hotspot").forEach(btn => btn.style.display = "none");
  }
  
  item.stop?.forEach(stopMotion);

  const body = item.body || [];
  if (action === "panel") {
    window.setTimeout(() => show(".ui-panel-question-text"), 420);
  } else if (action === "bubble-xiaohong") {
    // Crossfade character
    document.querySelector(".char-xiaohong").style.opacity = "0";
    document.querySelector(".char-xiaohong-2").style.opacity = "1";
    // Show bubble after crossfade
    window.setTimeout(() => {
      show(body[0]);
      window.setTimeout(() => {
        playActionAudio(action);
        playImageSequence(bubbleXiaohongSequence, 90);
      }, 220);
    }, 500);
  } else if (action === "bubble-right") {
    show(body[0]);
    window.setTimeout(() => {
      playActionAudio(action);
      playImageSequence(bubbleRightSequence, 90);
    }, 220);
  } else if (action === "bubble-boy") {
    show(body[0]);
    window.setTimeout(() => {
      playActionAudio(action);
      playImageSequence(bubbleBoySequence, 90);
    }, 220);
  } else if (body.length === 2) {
    show(body[0]);
    window.setTimeout(() => show(body[1]), 520);
  } else {
    body.forEach((sel) => show(sel));
  }

  if (action === "summary") {
    // Hide all hotspots when summary appears
    document.querySelectorAll(".hotspot").forEach(btn => btn.style.display = "none");
    
    // Explicitly set activeAction first so the global click listener knows we are in summary mode
    activeAction = "summary-1-shown";
    show(".summary-1");
  }
}

stage.addEventListener("pointerdown", (event) => {
  if (activeAction && !event.target.closest?.(".hotspot")) {
    event.preventDefault();
    closePopups();
    return;
  }
  const button = event.target.closest?.(".hotspot");
  const action = button?.dataset.action;
  if (!action) return;
  event.preventDefault();
  event.stopPropagation(); // 阻止事件冒泡，防止触发多次
  trigger(action);
}, true);

// Handle the explicit summary button click
document.getElementById("btn-summary")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation(); // Prevent this click from bubbling up and triggering the global close/next logic immediately
  if (activeAction === "summary-1-shown") return;
  trigger("summary");
});

window.addEventListener("pointerdown", (event) => {
  if (activeAction === "summary-1-shown") {
    if (event.target.closest("#btn-summary")) return;
    event.preventDefault();
    closePopups();
    return;
  }

  if (activeAction && !event.target.closest?.(".hotspot") && !event.target.closest?.(".popup-close") && !event.target.closest?.("#btn-summary")) {
    closePopups();
    return;
  }
  // Remove duplicate trigger logic from global listener
}, true);

function closePopups() {
  clearSequenceTimers();
  stopCurrentAudio();
  document.querySelectorAll(".ui-phone-chat, .reveal-new, .reveal-bag, .scroll-opened, .ui-panel-question-text, .bubble-xiaohong-bg, .bubble-xiaohong-seq, .bubble-right-bg, .bubble-right-seq, .bubble-boy-bg, .bubble-boy-seq, .effect-mist, .effect-hands, .base-doodle, .summary-1").forEach((el) => {
    el.classList.remove("is-visible");
  });

  // Restore original xiaohong character
  document.querySelector(".char-xiaohong").style.opacity = "1";
  document.querySelector(".char-xiaohong-2").style.opacity = "0";

  document.querySelectorAll(".hotspot").forEach((btn) => {
    btn.classList.remove("is-active", "is-pulsed");
    btn.style.display = ""; // Show hotspots again when closing popups
  });
  activeAction = null;
}

window.addEventListener("load", () => {
  lockViewportHeight();
  centerPortraitStage();
  const warmUp = () => {
    preloadInteractiveAssets();
    warmIdleImages();
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warmUp, { timeout: 1200 });
  } else {
    window.setTimeout(warmUp, 180);
  }
}, { once: true });

window.addEventListener("orientationchange", () => {
  window.setTimeout(() => {
    lockViewportHeight();
    centerPortraitStage();
  }, 250);
});

window.addEventListener("pointerdown", () => {
  if (!backgroundStarted) startBackgroundAudio();
}, { once: true, capture: true });
