const stage = document.querySelector("#stage");
const sceneOverlay = document.querySelector("#first-scene");
const sceneBackground = document.querySelector("#scene-background");
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
const photoMatches = {
  2: { scale: 1.34, from: { x: 0.7, y: 0.36 }, to: { x: 0.75, y: 0.35 } },
  3: { scale: 2.45, from: { x: 0.5, y: 0.4 }, to: { x: 0.5, y: 0.3 } },
};
let currentStep = 1;
let pointerAction = null;
let transitionInProgress = false;
let plushOffset = { x: 0, y: 0 };
let photoSwipe = null;

function setPlushOffset(x, y) {
  plushOffset = { x, y };
  plushLayer.setAttribute("transform", `translate(${x} ${y})`);
}

function setSceneReveal(progress) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  sceneBackground.style.opacity = String(1 - clampedProgress);
}

function animatePlushAndReveal(x, y, reveal, duration, onComplete) {
  stage.classList.add("is-animating-plush");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = { ...plushOffset };
  const startReveal = 1 - Number(sceneBackground.style.opacity || 1);
  const startedAt = performance.now();
  const animationDuration = reducedMotion ? 0 : duration;

  function frame(now) {
    const progress = animationDuration === 0 ? 1 : Math.min(1, (now - startedAt) / animationDuration);
    const eased = 1 - (1 - progress) ** 3;
    setPlushOffset(
      start.x + (x - start.x) * eased,
      start.y + (y - start.y) * eased,
    );
    setSceneReveal(startReveal + (reveal - startReveal) * eased);

    if (progress < 1) {
      window.requestAnimationFrame(frame);
    } else {
      stage.classList.remove("is-animating-plush");
      if (typeof onComplete === "function") onComplete();
    }
  }

  window.requestAnimationFrame(frame);
}

function activePhotoIndex(step = currentStep) {
  return Math.max(0, step - 2);
}

function updateProgress() {
  stage.dataset.step = String(currentStep);
  stage.setAttribute("aria-label", `Photo ${currentStep} sur 4`);
  floatingGifts.hidden = currentStep !== 1;
  sceneOverlay.setAttribute("aria-hidden", String(currentStep !== 1));
  plushLayer.setAttribute("tabindex", currentStep === 1 ? "0" : "-1");
  photos.forEach((photo, index) => {
    photo.setAttribute("aria-hidden", String(index + 2 !== currentStep));
    photo.classList.toggle("is-current", index === activePhotoIndex());
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
  stage.classList.remove("is-dragging-plush");

  const dx = plushOffset.x;
  const dy = plushOffset.y;
  let targetX = dx;
  let targetY = dy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    targetX = dx >= 0 ? viewBoxWidth * 1.3 : -viewBoxWidth * 1.3;
  } else {
    targetY = dy >= 0 ? viewBoxHeight * 1.25 : -viewBoxHeight * 1.25;
  }

  animatePlushAndReveal(targetX, targetY, 1, 620, () => {
    plushLayer.setAttribute("visibility", "hidden");
    setPlushOffset(0, 0);
    transitionInProgress = false;
  });
}

function settlePlushAtHome() {
  transitionInProgress = true;
  animatePlushAndReveal(0, 0, 0, 320, () => {
    transitionInProgress = false;
  });
}

function returnToFirstPhoto() {
  if (transitionInProgress) return;

  transitionInProgress = true;
  currentStep = 1;
  updateProgress();
  hint.textContent = "Fais glisser la grande peluche pour découvrir la suite.";
  controls.hidden = true;
  plushLayer.setAttribute("visibility", "visible");
  setSceneReveal(1);
  setPlushOffset(0, 0);

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => setSceneReveal(0));
  });
  window.setTimeout(() => {
    transitionInProgress = false;
  }, 700);
}

function applyPhotoSwipe(direction, progress) {
  if (!photoSwipe) return;
  const { outgoing, incoming } = photoSwipe;
  const amount = Math.max(0, Math.min(1, progress));

  outgoing.style.zIndex = "2";
  if (photoSwipe.toFirst) {
    outgoing.style.opacity = String(1 - amount);
    outgoing.style.transform = `translate3d(${amount * 14}%, 0, 0) scale(${1 - amount * 0.1})`;
    setSceneReveal(1 - amount);
    plushLayer.style.opacity = String(amount);
    photoSwipe.progress = amount;
    return;
  }

  const { scale } = photoSwipe.match;
  const outgoingFocus = direction > 0 ? photoSwipe.match.from : photoSwipe.match.to;
  const incomingFocus = direction > 0 ? photoSwipe.match.to : photoSwipe.match.from;
  const zoomScale = direction > 0
    ? 1 + (scale - 1) * amount
    : 1 - (1 - 1 / scale) * amount;
  const incomingScale = direction > 0
    ? 1 / scale + (1 - 1 / scale) * amount
    : scale + (1 - scale) * amount;
  const translateX = (outgoingFocus.x - incomingFocus.x) * stage.clientWidth;
  const translateY = (outgoingFocus.y - incomingFocus.y) * stage.clientHeight;
  outgoing.style.transformOrigin = `${outgoingFocus.x * 100}% ${outgoingFocus.y * 100}%`;
  incoming.style.transformOrigin = `${incomingFocus.x * 100}% ${incomingFocus.y * 100}%`;
  incoming.style.zIndex = "3";
  outgoing.style.opacity = String(1 - amount);
  outgoing.style.transform = `scale(${zoomScale})`;
  incoming.style.opacity = String(amount);
  incoming.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${incomingScale})`;
  photoSwipe.progress = amount;
}

function clearPhotoSwipe() {
  photos.forEach((photo) => {
    photo.style.removeProperty("z-index");
    photo.style.removeProperty("opacity");
    photo.style.removeProperty("transform");
    photo.style.removeProperty("transform-origin");
  });
  if (photoSwipe && photoSwipe.toFirst) {
    plushLayer.style.removeProperty("opacity");
    if (currentStep !== 1) {
      setSceneReveal(1);
      plushLayer.setAttribute("visibility", "hidden");
      sceneOverlay.setAttribute("aria-hidden", "true");
    }
  }
  stage.classList.remove("is-dragging-photos");
  photoSwipe = null;
}

function beginPhotoSwipe(direction) {
  const nextStep = currentStep + direction;
  if (currentStep === 1 || nextStep < 1 || nextStep > 4) return false;
  if (photoSwipe && photoSwipe.direction === direction) return true;

  clearPhotoSwipe();
  if (nextStep === 1) {
    photoSwipe = {
      direction,
      outgoing: photos[activePhotoIndex()],
      incoming: null,
      progress: 0,
      toFirst: true,
    };
    sceneOverlay.setAttribute("aria-hidden", "false");
    plushLayer.setAttribute("visibility", "visible");
    plushLayer.style.opacity = "0";
    setSceneReveal(1);
    stage.classList.add("is-dragging-photos");
    applyPhotoSwipe(direction, 0);
    return true;
  }

  photoSwipe = {
    direction,
    outgoing: photos[activePhotoIndex()],
    incoming: photos[activePhotoIndex(nextStep)],
    progress: 0,
    match: photoMatches[Math.min(currentStep, nextStep)],
  };
  stage.classList.add("is-dragging-photos");
  applyPhotoSwipe(direction, 0);
  return true;
}

function finishPhotoSwipe(shouldAdvance) {
  if (!photoSwipe || transitionInProgress) return;

  transitionInProgress = true;
  const { direction, progress } = photoSwipe;
  const target = shouldAdvance ? 1 : 0;
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 130 + Math.abs(target - progress) * 260;
  const startedAt = performance.now();

  function frame(now) {
    const elapsed = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration);
    const eased = 1 - (1 - elapsed) ** 3;
    applyPhotoSwipe(direction, progress + (target - progress) * eased);

    if (elapsed < 1) {
      window.requestAnimationFrame(frame);
      return;
    }

    if (shouldAdvance) {
      currentStep += direction;
      updateProgress();
      if (currentStep === 1) {
        controls.hidden = true;
        hint.textContent = "Fais glisser la grande peluche pour découvrir la suite.";
      } else {
        hint.textContent = currentStep === 4
          ? "Dernière photo ! Balaye vers la droite pour revenir."
          : "Balaye vers la gauche pour continuer, vers la droite pour revenir.";
      }
    }

    clearPhotoSwipe();
    transitionInProgress = false;
  }

  window.requestAnimationFrame(frame);
}

function goToPhoto(step) {
  if (transitionInProgress || step < 1 || step > 4 || step === currentStep) return;
  if (step === 1) {
    returnToFirstPhoto();
    return;
  }
  if (currentStep === 1) return;

  const direction = step > currentStep ? 1 : -1;
  if (!beginPhotoSwipe(direction)) return;
  finishPhotoSwipe(true);
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
    stage.classList.add("is-dragging-plush");
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
  if (!pointerAction || pointerAction.id !== event.pointerId) return;
  const bounds = stage.getBoundingClientRect();
  const deltaX = event.clientX - pointerAction.startX;
  const deltaY = event.clientY - pointerAction.startY;

  if (pointerAction.kind === "swipe") {
    if (Math.abs(deltaX) < 3 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    const direction = deltaX < 0 ? 1 : -1;
    if (!beginPhotoSwipe(direction)) return;

    pointerAction.direction = direction;
    applyPhotoSwipe(direction, Math.min(1, Math.abs(deltaX) / (bounds.width * 0.78)));
    event.preventDefault();
    return;
  }

  pointerAction.x = deltaX;
  pointerAction.y = deltaY;
  const x = Math.max(-bounds.width * 1.25, Math.min(bounds.width * 1.25, deltaX)) * (viewBoxWidth / bounds.width);
  const y = Math.max(-bounds.height * 1.25, Math.min(bounds.height * 1.25, deltaY)) * (viewBoxHeight / bounds.height);
  setPlushOffset(x, y);
  setSceneReveal(Math.hypot(deltaX, deltaY) / (bounds.width * 0.72));
  event.preventDefault();
}

function onPointerUp(event) {
  if (!pointerAction || pointerAction.id !== event.pointerId) return;
  const action = pointerAction;
  pointerAction = null;

  if (action.kind === "drag") {
    plushLayer.classList.remove("is-dragging");
    stage.classList.remove("is-dragging-plush");
    if (event.type === "pointercancel") {
      settlePlushAtHome();
      return;
    }

    const distance = Math.hypot(action.x, action.y);
    if (distance > Math.max(48, stage.clientWidth * 0.14)) {
      revealSecondPhoto();
    } else {
      settlePlushAtHome();
    }
    return;
  }

  if (!photoSwipe) return;
  finishPhotoSwipe(event.type !== "pointercancel" && photoSwipe.progress >= 0.2);
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
