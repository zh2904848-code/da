const stage = document.querySelector("#stage");
const shown = new Set();
let activeAction = null;
let sequenceTimers = [];

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

const hitZones = [
  { action: "bubble-boy", x: 15.7, y: 42.2, w: 7.8, h: 11.5 },
  { action: "bag", x: 26.6, y: 84.1, w: 8.6, h: 14.8 },
  { action: "scroll", x: 3.5, y: 0.8, w: 5.5, h: 8.5 },
  { action: "phone", x: 12.1, y: 44.0, w: 8.4, h: 12.5 },
  { action: "bubble-xiaohong", x: 55.6, y: 51.8, w: 8.8, h: 12.5 },
  { action: "erase", x: 42.0, y: 61.0, w: 7.5, h: 10.5 },
  { action: "bag", x: 40.4, y: 81.5, w: 8.4, h: 12.5 },
  { action: "bubble-right", x: 74.3, y: 44.0, w: 15.2, h: 18.5 },
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

function show(sel) {
  const el = document.querySelector(sel);
  if (el) el.classList.add("is-visible");
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
  flashHotspot(action);
  
  // Hide hotspots only for specific fullscreen/popup
  const fullscreenActions = ["new-image", "bag", "phone"];
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
      window.setTimeout(() => playImageSequence(bubbleXiaohongSequence, 90), 220);
    }, 500);
  } else if (action === "bubble-right") {
    show(body[0]);
    window.setTimeout(() => playImageSequence(bubbleRightSequence, 90), 220);
  } else if (action === "bubble-boy") {
    show(body[0]);
    window.setTimeout(() => playImageSequence(bubbleBoySequence, 90), 220);
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

function actionFromPoint(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  const zone = hitZones.find((item) => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
  return zone?.action || null;
}

stage.addEventListener("pointerdown", (event) => {
  if (activeAction && !event.target.closest?.(".hotspot")) {
    event.preventDefault();
    closePopups();
    return;
  }
  const button = event.target.closest?.(".hotspot");
  const action = button?.dataset.action || actionFromPoint(event.clientX, event.clientY);
  if (!action) return;
  event.preventDefault();
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
  if (event.target.closest?.(".stage")) return;
  const action = actionFromPoint(event.clientX, event.clientY);
  if (!action) return;
  event.preventDefault();
  trigger(action);
}, true);

function closePopups() {
  clearSequenceTimers();
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
