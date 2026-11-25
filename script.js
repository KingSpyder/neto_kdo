const stage = document.querySelector("#stage");
const sceneOverlay = document.querySelector("#first-scene");
const plushLayer = document.querySelector("#plush-layer");
const plushOutline = document.querySelector("#plush-outline");
const floatingGifts = document.querySelector("#floating-gifts");
const hint = document.querySelector("#hint");
const controls = document.querySelector("#controls");
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const progressItems = [...document.querySelectorAll("#progress li")];
const photos = [
  document.querySelector("#photo-two"),
  document.querySelector("#photo-three"),
  document.querySelector("#photo-four"),
];

const viewBoxWidth = 1500;
const viewBoxHeight = 2000;
let currentStep = 1;
let pointerAction = null;
let transitionTimer = 0;
let transitionInProgress = false;
let plushOffset = { x: 0, y: 0 };

function setPlushOffset(x, y) {
  plushOffset = { x, y };
  plushLayer.setAttribute("transform", `translate(${x} ${y})`);
}

function animatePlushTo(x, y, duration) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = { ...plushOffset };
  const startedAt = performance.now();
  const animationDuration = reducedMotion ? 0 : duration;

  function frame(now) {
    const progress = animationDuration === 0 ? 1 : Math.min(1, (now - startedAt) / animationDuration);
    const eased = 1 - (1 - progress) ** 3;
    setPlushOffset(
      start.x + (x - start.x) * eased,
      start.y + (y - start.y) * eased,
    );
    if (progress < 1) window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
}

function updateProgress() {
  stage.dataset.step = String(currentStep);
  stage.setAttribute("aria-label", `Photo ${currentStep} sur 4`);
  floatingGifts.hidden = currentStep !== 1;
  sceneOverlay.setAttribute("aria-hidden", String(currentStep !== 1));
  plushLayer.setAttribute("tabindex", currentStep === 1 ? "0" : "-1");
  photos.forEach((photo, index) => {
    photo.setAttribute("aria-hidden", String(index + 2 !== currentStep));
  });
  progressItems.forEach((item, index) => {
    const active = index === currentStep - 1;
    item.classList.toggle("is-current", active);
    item.setAttribute("aria-current", active ? "step" : "false");
  });
  previousButton.disabled = currentStep === 1;
  nextButton.disabled = currentStep === 4;
}

function revealSecondPhoto() {
  if (currentStep !== 1 || transitionInProgress) return;

  transitionInProgress = true;
  currentStep = 2;
  controls.hidden = false;
  updateProgress();
  hint.textContent = "Balaye vers la gauche pour zoomer sur la suite.";
  plushLayer.classList.remove("is-dragging");

  const dx = plushOffset.x;
  const dy = plushOffset.y;
  let targetX = dx;
  let targetY = dy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    targetX = dx >= 0 ? viewBoxWidth * 1.3 : -viewBoxWidth * 1.3;
  } else {
    targetY = dy >= 0 ? viewBoxHeight * 1.25 : -viewBoxHeight * 1.25;
  }
  animatePlushTo(targetX, targetY, 620);
  sceneOverlay.classList.add("is-fading");
  window.setTimeout(() => {
    plushLayer.setAttribute("visibility", "hidden");
    transitionInProgress = false;
  }, 720);
}

function returnToFirstPhoto() {
  if (transitionInProgress) return;
  transitionInProgress = true;
  currentStep = 1;
  updateProgress();
  hint.textContent = "Fais glisser la grande peluche pour découvrir la suite.";
  controls.hidden = true;
  plushLayer.classList.remove("is-moving-away");
  plushLayer.setAttribute("visibility", "visible");
  plushLayer.setAttribute("visibility", "visible");
  setPlushOffset(0, 0);
  window.requestAnimationFrame(() => {
    sceneOverlay.classList.remove("is-fading");
  });
  transitionTimer = window.setTimeout(() => {
    transitionInProgress = false;
  }, 700);
}

function goToPhoto(step) {
  if (transitionInProgress || step < 1 || step > 4 || step === currentStep) return;
  if (step === 1) {
    returnToFirstPhoto();
    return;
  }
  if (currentStep === 1) return;

  transitionInProgress = true;
  window.clearTimeout(transitionTimer);
  const outgoing = photos[currentStep - 2];
  const incoming = photos[step - 2];

  outgoing.classList.remove("is-current");
  outgoing.classList.add("is-leaving");
  incoming.classList.remove("is-leaving");
  incoming.classList.add("is-current");
  currentStep = step;
  updateProgress();
  hint.textContent = step === 4
    ? "Dernière photo ! Balaye vers la droite pour revenir."
    : "Balaye vers la gauche pour continuer, vers la droite pour revenir.";

  transitionTimer = window.setTimeout(() => {
    outgoing.classList.remove("is-leaving");
    transitionInProgress = false;
  }, 1100);
}

function pointInsidePlush(event) {
  const svgPoint = sceneOverlay.createSVGPoint();
  svgPoint.x = event.clientX;
  svgPoint.y = event.clientY;
  const screenMatrix = sceneOverlay.getScreenCTM();
  if (!screenMatrix) return false;
  const localPoint = svgPoint.matrixTransform(screenMatrix.inverse());
  if (typeof plushOutline.isPointInFill === "function") {
    return plushOutline.isPointInFill(localPoint);
  }
  return plushLayer.contains(event.target);
}

function onPointerDown(event) {
  if (transitionInProgress || event.button > 0) return;

  if (currentStep === 1) {
    if (!pointInsidePlush(event)) return;
    pointerAction = {
      kind: "drag",
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
    };
    stage.setPointerCapture(event.pointerId);
    plushLayer.classList.add("is-dragging");
    event.preventDefault();
    return;
  }

  pointerAction = {
    kind: "swipe",
    id: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
  };
  stage.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!pointerAction || pointerAction.id !== event.pointerId || pointerAction.kind !== "drag") return;
  const bounds = stage.getBoundingClientRect();
  const deltaX = event.clientX - pointerAction.startX;
  const deltaY = event.clientY - pointerAction.startY;
  pointerAction.x = deltaX;
  pointerAction.y = deltaY;
  const x = Math.max(-bounds.width * 1.25, Math.min(bounds.width * 1.25, deltaX)) * (viewBoxWidth / bounds.width);
  const y = Math.max(-bounds.height * 1.25, Math.min(bounds.height * 1.25, deltaY)) * (viewBoxHeight / bounds.height);
  setPlushOffset(x, y);
  event.preventDefault();
}

function onPointerUp(event) {
  if (!pointerAction || pointerAction.id !== event.pointerId) return;
  const action = pointerAction;
  pointerAction = null;

  if (action.kind === "drag") {
    plushLayer.classList.remove("is-dragging");
    if (event.type === "pointercancel") {
      animatePlushTo(0, 0, 320);
      return;
    }
    const distance = Math.hypot(action.x, action.y);
    if (distance > Math.max(48, stage.clientWidth * 0.14)) {
      revealSecondPhoto();
    } else {
      animatePlushTo(0, 0, 320);
    }
    return;
  }

  const deltaX = event.clientX - action.startX;
  const deltaY = event.clientY - action.startY;
  if (Math.abs(deltaX) < Math.max(42, stage.clientWidth * 0.12) || Math.abs(deltaX) < Math.abs(deltaY)) return;
  goToPhoto(currentStep + (deltaX < 0 ? 1 : -1));
}

stage.addEventListener("pointerdown", onPointerDown);
stage.addEventListener("pointermove", onPointerMove);
stage.addEventListener("pointerup", onPointerUp);
stage.addEventListener("pointercancel", onPointerUp);

plushLayer.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    revealSecondPhoto();
  }
});

stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToPhoto(currentStep + 1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    goToPhoto(currentStep - 1);
  }
});

previousButton.addEventListener("click", () => goToPhoto(currentStep - 1));
nextButton.addEventListener("click", () => goToPhoto(currentStep + 1));

updateProgress();
