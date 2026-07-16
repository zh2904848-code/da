const stage = document.querySelector("#stage");
const stageShell = document.querySelector(".stage-shell");
const app = document.querySelector(".app");
const shown = new Set();
let activeAction = null;
let sequenceTimers = [];
let activeSequenceSelectors = [];
let sequenceRunId = 0;
let currentAudio = null;
let actionAudio = null;
let backgroundAudio = null;
let backgroundStarted = false;
const backgroundVolume = 0.02;
const duckedBackgroundVolume = 0.005;
const bodyPreloadPromises = new Map();
const audioPreloadPromises = new Map();

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
  },
  "bubble-right": {
    body: [".bubble-right-bg"],
  },
  "bubble-boy": {
    body: [".bubble-boy-bg"],
  },
  "new-image": {
    body: [".reveal-new"],
  },
  bag: {
    body: [".reveal-bag"],
  },
  phone: {
    body: [".ui-phone-chat"],
  },
  panel: {
    body: [".ui-panel-question-text"],
  },
  scroll: {
    body: [".scroll-opened"],
  },
  erase: {
    body: [".effect-mist", ".effect-hands", ".base-doodle"],
  },
  summary: {
    body: [".summary-1"],
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
  "bubble-right": "audio_bubble_right.mp3",
  "bubble-xiaohong": "audio_bubble_xiaohong.mp3",
  "bubble-boy": "audio_bubble_boy.mp3",
};

function centerPortraitStage() {
  if (!stageShell) return;
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  if (!isPortrait || stageShell.scrollWidth <= stageShell.clientWidth) return;
  stageShell.scrollLeft = (stageShell.scrollWidth - stageShell.clientWidth) / 2;
}

function ensureBackgroundAudio() {
  if (backgroundAudio) return backgroundAudio;
  const audio = new Audio(encodeURI("./23/背景音乐2.mp3?v=2"));
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

function resolveAudioSource(source) {
  return source.startsWith("data:") ? source : encodeURI(`./23/${source}`);
}

function preloadActionAudio(action) {
  const source = audioFileMap[action];
  if (!source) return Promise.resolve();
  if (!audioPreloadPromises.has(action)) {
    const preload = fetch(resolveAudioSource(source), { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`Audio preload failed: ${response.status}`);
        return response.arrayBuffer();
      })
      .then(() => undefined)
      .catch(() => undefined);
    audioPreloadPromises.set(action, preload);
  }
  return audioPreloadPromises.get(action);
}

function loadLazyImage(el) {
  if (!el) return Promise.resolve();
  const mobileSource = el.parentElement?.querySelector?.("source[data-srcset]");
  if (mobileSource && !mobileSource.srcset) {
    mobileSource.srcset = mobileSource.dataset.srcset;
  }
  if (!el.getAttribute("src") && el.dataset?.src) {
    el.src = el.dataset.src;
  }
  if (!el.getAttribute("src")) return Promise.resolve();
  if (el.complete && el.naturalWidth > 0) {
    return el.decode?.().catch(() => {}) || Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => {
      el.decode?.().catch(() => {}).finally(resolve);
    };
    el.addEventListener("load", done, { once: true });
    el.addEventListener("error", resolve, { once: true });
  });
}

function preloadImageSelectors(selectors = []) {
  const elements = selectors.flatMap((sel) => Array.from(document.querySelectorAll(sel)));
  return Promise.all(elements.map(loadLazyImage));
}

function preloadActionBody(action) {
  const selectors = revealMap[action]?.body || [];
  if (!selectors.length) return Promise.resolve();
  if (!bodyPreloadPromises.has(action)) {
    bodyPreloadPromises.set(action, preloadImageSelectors(selectors));
  }
  return bodyPreloadPromises.get(action);
}

function scheduleActionBodyPreload(action) {
  if (!action) return;
  const run = () => Promise.all([
    preloadActionBody(action),
    preloadActionAudio(action),
  ]);
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1600 });
  } else {
    window.setTimeout(run, 350);
  }
}

function preloadNextAction(action) {
  const index = flowOrder.indexOf(action);
  if (index >= 0) scheduleActionBodyPreload(flowOrder[index + 1]);
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
  sequenceRunId += 1;
}

function releaseLazyImages(selectors = []) {
  selectors.flatMap((sel) => Array.from(document.querySelectorAll(sel))).forEach((el) => {
    el.classList.remove("is-visible");
    if (el.dataset?.src) el.removeAttribute("src");
    const mobileSource = el.parentElement?.querySelector?.("source[data-srcset]");
    mobileSource?.removeAttribute("srcset");
  });
}

function hideLazyImages(selectors = []) {
  selectors.flatMap((sel) => Array.from(document.querySelectorAll(sel))).forEach((el) => {
    el.classList.remove("is-visible");
  });
}

function releaseActionAssets(action) {
  releaseLazyImages(activeSequenceSelectors);
  activeSequenceSelectors = [];
  if (!action) return;
  releaseLazyImages(revealMap[action]?.body || []);
  bodyPreloadPromises.delete(action);
}

async function playImageSequence(action, selectors, stepDelay = 35) {
  clearSequenceTimers();
  hideLazyImages(activeSequenceSelectors);
  activeSequenceSelectors = selectors;
  const runId = sequenceRunId;
  selectors.forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.classList.remove("is-visible");
  });

  await preloadImageSelectors(selectors);
  if (runId !== sequenceRunId || activeAction !== action) return;

  const showNext = (index) => {
    if (runId !== sequenceRunId || activeAction !== action) return;
    const el = document.querySelector(selectors[index]);
    el?.classList.add("is-visible");
    if (index >= selectors.length - 1) return;
    const timerId = window.setTimeout(() => showNext(index + 1), stepDelay);
    sequenceTimers.push(timerId);
  };

  void showNext(0);
}

function scheduleForAction(action, callback, delay) {
  const timerId = window.setTimeout(() => {
    if (activeAction === action) callback();
  }, delay);
  sequenceTimers.push(timerId);
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

async function playActionAudio(action) {
  stopCurrentAudio();
  const source = audioFileMap[action];
  if (!source) return;
  await preloadActionAudio(action);
  if (activeAction !== action) return;
  const audio = ensureActionAudio();
  audio.src = resolveAudioSource(source);
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
  if (!shown.has(action)) {
    shown.add(action);
    updateClueCounter();
  }
  activeAction = action;
  app?.classList.add("has-active-popup");
  flashHotspot(action);
  
  // Hide hotspots only for specific fullscreen/popup
  const fullscreenActions = ["new-image", "bag", "phone", "erase"];
  if (fullscreenActions.includes(action)) {
    document.querySelectorAll(".hotspot").forEach(btn => btn.style.display = "none");
  }
  
  const body = item.body || [];
  const revealBubble = async (sequence) => {
    await preloadActionBody(action);
    if (activeAction !== action) return;
    show(body[0]);
    scheduleForAction(action, () => {
      playActionAudio(action);
      playImageSequence(action, sequence);
    }, 220);
  };

  if (action === "panel") {
    const panelReady = preloadActionBody(action);
    scheduleForAction(action, () => {
      void panelReady.then(() => {
        if (activeAction === action) show(".ui-panel-question-text");
      });
    }, 420);
  } else if (action === "bubble-xiaohong") {
    // Crossfade character
    document.querySelector(".char-xiaohong").style.opacity = "0";
    document.querySelector(".char-xiaohong-2").style.opacity = "1";
    // Show bubble after crossfade
    scheduleForAction(action, () => void revealBubble(bubbleXiaohongSequence), 500);
  } else if (action === "bubble-right") {
    void revealBubble(bubbleRightSequence);
  } else if (action === "bubble-boy") {
    void revealBubble(bubbleBoySequence);
  } else {
    void preloadActionBody(action).then(() => {
      if (activeAction !== action) return;
      if (body.length === 2) {
        show(body[0]);
        scheduleForAction(action, () => show(body[1]), 520);
      } else {
        body.forEach((sel) => show(sel));
      }
    });
  }

  if (action === "summary") {
    // Hide all hotspots when summary appears
    document.querySelectorAll(".hotspot").forEach(btn => btn.style.display = "none");
    
  }
  preloadNextAction(action);
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
  event.stopPropagation(); // Prevent duplicate trigger from bubbling.
  void trigger(action);
}, true);

// Handle the explicit summary button click
document.getElementById("btn-summary")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation(); // Prevent this click from bubbling up and triggering the global close/next logic immediately
  if (activeAction === "summary") return;
  void trigger("summary");
});

window.addEventListener("pointerdown", (event) => {
  if (activeAction === "summary") {
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
  const closingAction = activeAction;
  activeAction = null;
  app?.classList.remove("has-active-popup");
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
  releaseActionAssets(closingAction);
}

function resetRestoredPage() {
  closePopups();
  shown.clear();
  updateClueCounter();

  const counterEl = document.getElementById("clue-counter");
  const btnSummary = document.getElementById("btn-summary");
  if (counterEl) counterEl.style.opacity = "1";
  if (btnSummary) {
    btnSummary.style.display = "none";
    btnSummary.style.opacity = "0";
  }
}

window.addEventListener("load", () => {
  lockViewportHeight();
  centerPortraitStage();
  const warmUp = () => {
    scheduleActionBodyPreload(flowOrder[0]);
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warmUp, { timeout: 1200 });
  } else {
    window.setTimeout(warmUp, 180);
  }
}, { once: true });

window.addEventListener("pagehide", () => {
  closePopups();
  if (backgroundAudio) backgroundAudio.pause();
  backgroundStarted = false;
});

window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  resetRestoredPage();
  lockViewportHeight();
  centerPortraitStage();
  scheduleActionBodyPreload(flowOrder[0]);
});

window.addEventListener("orientationchange", () => {
  window.setTimeout(() => {
    lockViewportHeight();
    centerPortraitStage();
  }, 250);
});

window.visualViewport?.addEventListener("resize", () => {
  lockViewportHeight();
  centerPortraitStage();
});

window.addEventListener("pointerdown", () => {
  if (!backgroundStarted) startBackgroundAudio();
}, { once: true, capture: true });
