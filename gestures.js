// Shared touch behavior for the readers. App-specific navigation and sizing
// are callbacks so Ngondro and Vajracchedika can use the same implementation.
function installReaderGestures(area, {isPageMode, isBlocked, turnPage, resizeText}) {
  let gesture = null;
  let ignoreClickUntil = 0;
  const distance = touches => Math.hypot(touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY);
  const eligible = target => isPageMode() && !isBlocked(target) && window.getSelection().isCollapsed;
  const consume = event => {
    if (event.cancelable) event.preventDefault();
    ignoreClickUntil = performance.now() + 700;
  };

  function onTouchStart(event) {
    const touches = [...event.touches];
    if (!eligible(event.target) || touches.some(touch => !area.contains(touch.target)) || touches.length > 2) {
      gesture = {kind:'ignore'};
      return;
    }
    // A pinch never becomes a swipe when one finger lifts first.
    if (gesture?.kind === 'pinch' || gesture?.kind === 'ignore') return;
    if (touches.length === 2) {
      gesture = {kind:'pinch', initial:distance(touches), last:distance(touches), finished:false};
      consume(event);
    } else if (touches.length === 1) {
      const touch = touches[0];
      gesture = {kind:'swipe', id:touch.identifier, x:touch.clientX, y:touch.clientY,
        lastX:touch.clientX, lastY:touch.clientY, started:performance.now(),
        paged:isPageMode(), vertical:false};
    }
  }

  function onTouchMove(event) {
    if (!gesture || gesture.kind === 'ignore') return;
    if (!eligible(event.target)) { gesture = {kind:'ignore'}; return; }
    const touches = [...event.touches];
    if (gesture.kind === 'pinch') {
      consume(event);
      if (!gesture.finished && touches.length === 2) gesture.last = distance(touches);
      return;
    }
    const touch = touches.find(touch => touch.identifier === gesture.id);
    if (!touch) return;
    gesture.lastX = touch.clientX;
    gesture.lastY = touch.clientY;
    const dx = Math.abs(gesture.lastX - gesture.x), dy = Math.abs(gesture.lastY - gesture.y);
    if (dy > 12 && dy > dx) gesture.vertical = true;
    if (gesture.paged && !gesture.vertical && dx > 8 && dx > dy * 1.4) consume(event);
  }

  function onTouchEnd(event) {
    if (!gesture) return;
    if (gesture.kind === 'pinch') {
      consume(event);
      if (!gesture.finished && eligible(event.target)) {
        gesture.finished = true;
        const delta = gesture.last - gesture.initial;
        if (Math.abs(delta) >= Math.max(12, gesture.initial * .08)) resizeText(delta > 0 ? 1 : -1);
      }
      if (!event.touches.length) gesture = null;
      return;
    }
    if (gesture.kind === 'swipe' && !event.touches.length) {
      const touch = [...event.changedTouches].find(touch => touch.identifier === gesture.id);
      const dx = (touch?.clientX ?? gesture.lastX) - gesture.x;
      const dy = (touch?.clientY ?? gesture.lastY) - gesture.y;
      if (gesture.paged && isPageMode() && !gesture.vertical && eligible(event.target) &&
          performance.now() - gesture.started < 800 && Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        consume(event);
        turnPage(dx < 0 ? 1 : -1);
      }
    }
    if (!event.touches.length) gesture = null;
  }

  function onTouchCancel() {
    if (gesture?.kind === 'pinch') ignoreClickUntil = performance.now() + 700;
    gesture = null;
  }

  // Some browsers synthesize an edge-tap click after a swipe/pinch. Do not
  // turn a second page; ordinary taps and keyboard activation still work.
  function onClick(event) {
    if (event.detail && performance.now() < ignoreClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  // Non-passive touch listeners make the browser wait for JavaScript before
  // scrolling. Register them only while pages own the gesture, and remove
  // them entirely when scrolling is native again.
  const listeners = [
    ['touchstart', onTouchStart, {passive:false}],
    ['touchmove', onTouchMove, {passive:false}],
    ['touchend', onTouchEnd, {passive:false}],
    ['touchcancel', onTouchCancel, {passive:true}],
    ['click', onClick, {capture:true}]
  ];
  let enabled = false;
  function syncMode() {
    const next = isPageMode();
    if (next === enabled) return;
    gesture = null;
    ignoreClickUntil = 0;
    enabled = next;
    for (const [type, listener, options] of listeners) {
      if (enabled) area.addEventListener(type, listener, options);
      else area.removeEventListener(type, listener, options);
    }
  }
  syncMode();
  return {syncMode};
}
