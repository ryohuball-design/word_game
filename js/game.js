/**
 * ゲーム本体：文字の配置・強調・正誤判定
 */
const Game = (() => {
  let question = null;
  let slots = []; // { char: string|null, tileId: string|null }
  let tiles = []; // { id, char, used }
  let activeSlotIndex = 0;
  let dragState = null;

  const els = {};
  const DRAG_THRESHOLD = 12;

  function bindElements() {
    els.image = document.getElementById("question-image");
    els.slots = document.getElementById("answer-slots");
    els.tray = document.getElementById("letter-tray");
    els.submit = document.getElementById("btn-submit");
  }

  function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function start(q) {
    bindElements();
    question = q;
    const answerChars = Array.from(q.answer);
    slots = answerChars.map(() => ({ char: null, tileId: null }));
    tiles = shuffle(q.letters.map((char, i) => ({
      id: `t-${q.id}-${i}-${char}-${Math.random().toString(36).slice(2, 6)}`,
      char,
      used: false,
    })));
    activeSlotIndex = 0;

    setIllustration(q);

    renderAll();
  }

  function setIllustration(q) {
    const img = els.image;
    const src = q.image;
    img.classList.remove("is-missing");
    img.alt = q.label || q.answer;
    // スマホの古いキャッシュでSVG等を掴むのを避ける
    img.onerror = () => {
      img.onerror = null;
      img.removeAttribute("src");
      img.classList.add("is-missing");
    };
    img.onload = () => {
      img.classList.remove("is-missing");
    };
    img.src = `${src}?v=png1`;
  }

  function findNextEmptySlot(from = 0) {
    for (let i = from; i < slots.length; i += 1) {
      if (!slots[i].char) return i;
    }
    for (let i = 0; i < from; i += 1) {
      if (!slots[i].char) return i;
    }
    return -1;
  }

  function updateActiveSlot() {
    activeSlotIndex = findNextEmptySlot(Math.max(0, activeSlotIndex));
    [...els.slots.children].forEach((el, i) => {
      el.classList.toggle("is-active", i === activeSlotIndex && !slots[i].char);
      el.classList.toggle("is-filled", Boolean(slots[i].char));
    });
  }

  function updateSubmit() {
    const full = slots.every((s) => Boolean(s.char));
    els.submit.disabled = !full;
  }

  function renderAll() {
    renderSlots();
    renderTray();
    updateSubmit();
  }

  function renderSlots() {
    els.slots.innerHTML = "";
    els.slots.dataset.count = String(slots.length);
    slots.forEach((slot, index) => {
      const div = document.createElement("div");
      div.className = "slot";
      div.dataset.slotIndex = String(index);
      div.setAttribute("role", "button");
      div.setAttribute("aria-label", `${index + 1}もじめ`);

      if (slot.char) {
        const letter = document.createElement("div");
        letter.className = "slot-letter";
        letter.textContent = slot.char;
        letter.dataset.tileId = slot.tileId;
        enablePointer(letter, { fromSlot: index, tileId: slot.tileId, char: slot.char });
        div.appendChild(letter);
      }

      div.addEventListener("pointerup", (e) => {
        // 空き枠をタップで選択（文字ドラッグ中は無視）
        if (dragState) return;
        if (e.button != null && e.button !== 0) return;
        if (!slots[index].char) {
          activeSlotIndex = index;
          updateActiveSlot();
        }
      });

      els.slots.appendChild(div);
    });
    updateActiveSlot();
  }

  function renderTray() {
    els.tray.innerHTML = "";
    tiles.forEach((tile) => {
      if (tile.used) return; // 使った文字はトレイから除外
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "letter-tile";
      btn.textContent = tile.char;
      btn.dataset.tileId = tile.id;
      enablePointer(btn, { fromTray: true, tileId: tile.id, char: tile.char });
      els.tray.appendChild(btn);
    });
  }

  function getTile(tileId) {
    return tiles.find((t) => t.id === tileId);
  }

  function clearSlot(index) {
    const slot = slots[index];
    if (!slot || !slot.tileId) return;
    const tile = getTile(slot.tileId);
    if (tile) tile.used = false;
    slots[index] = { char: null, tileId: null };
  }

  function placeTileInSlot(tileId, slotIndex) {
    if (slotIndex < 0 || slotIndex >= slots.length) return false;
    const tile = getTile(tileId);
    if (!tile || tile.used) return false;

    if (slots[slotIndex].tileId) {
      clearSlot(slotIndex);
    }

    tile.used = true;
    slots[slotIndex] = { char: tile.char, tileId: tile.id };
    activeSlotIndex = findNextEmptySlot(slotIndex + 1);
    renderAll();
    return true;
  }

  function moveFromSlotToSlot(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    const from = slots[fromIndex];
    const to = slots[toIndex];
    if (!from.tileId) return;

    if (!to.tileId) {
      slots[toIndex] = { char: from.char, tileId: from.tileId };
      slots[fromIndex] = { char: null, tileId: null };
    } else {
      slots[fromIndex] = { char: to.char, tileId: to.tileId };
      slots[toIndex] = { char: from.char, tileId: from.tileId };
    }
    activeSlotIndex = findNextEmptySlot(0);
    renderAll();
  }

  function returnToTray(fromIndex) {
    clearSlot(fromIndex);
    activeSlotIndex = fromIndex;
    renderAll();
  }

  function placeIntoActiveOrNext(tileId) {
    const target = activeSlotIndex >= 0 ? activeSlotIndex : findNextEmptySlot(0);
    return placeTileInSlot(tileId, target);
  }

  /* ----- Pointer DnD（タッチ + マウス） ----- */
  function enablePointer(el, meta) {
    el.addEventListener("pointerdown", (e) => onPointerDown(e, meta));
  }

  function onPointerDown(e, meta) {
    if (e.button != null && e.button !== 0) return;
    const tile = getTile(meta.tileId);
    if (!tile) return;
    if (meta.fromTray && tile.used) return;

    e.preventDefault();

    dragState = {
      meta,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      ghost: null,
      pointerId: e.pointerId,
      sourceEl: e.currentTarget,
    };

    elSetPointerCaptureSafe(e.currentTarget, e.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function elSetPointerCaptureSafe(el, pointerId) {
    try {
      if (el.setPointerCapture) el.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e) {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    if (!dragState.moved) {
      dragState.moved = true;
      const ghost = document.createElement("div");
      ghost.className = "drag-ghost";
      ghost.textContent = dragState.meta.char;
      document.body.appendChild(ghost);
      dragState.ghost = ghost;
      dragState.sourceEl.classList.add("is-ghost");
    }

    if (dragState.ghost) {
      dragState.ghost.style.left = `${e.clientX}px`;
      dragState.ghost.style.top = `${e.clientY}px`;
    }

    highlightDropTarget(e.clientX, e.clientY);
  }

  function highlightDropTarget(x, y) {
    document.querySelectorAll(".slot.drop-target-hover").forEach((s) => {
      s.classList.remove("drop-target-hover");
    });
    const target = document.elementFromPoint(x, y);
    const slot = target && target.closest ? target.closest(".slot") : null;
    if (slot) slot.classList.add("drop-target-hover");
  }

  function onPointerUp(e) {
    if (!dragState) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    const state = dragState;
    dragState = null;

    document.querySelectorAll(".slot.drop-target-hover").forEach((s) => {
      s.classList.remove("drop-target-hover");
    });
    if (state.ghost) state.ghost.remove();
    if (state.sourceEl) state.sourceEl.classList.remove("is-ghost");

    const dropEl = document.elementFromPoint(e.clientX, e.clientY);
    const slotEl = dropEl && dropEl.closest ? dropEl.closest(".slot") : null;
    const trayEl = dropEl && dropEl.closest ? dropEl.closest(".letter-tray") : null;

    // タップ（ほとんど動かしていない）→ トレイからなら次の枠へ / 枠内ならトレイへ戻す
    if (!state.moved) {
      if (state.meta.fromTray) {
        placeIntoActiveOrNext(state.meta.tileId);
      } else if (state.meta.fromSlot != null) {
        returnToTray(state.meta.fromSlot);
      }
      return;
    }

    // ドラッグ：枠の上で離せば配置 / トレイ上なら戻す
    if (slotEl) {
      const toIndex = Number(slotEl.dataset.slotIndex);
      if (state.meta.fromTray) {
        placeTileInSlot(state.meta.tileId, toIndex);
      } else if (state.meta.fromSlot != null) {
        moveFromSlotToSlot(state.meta.fromSlot, toIndex);
      }
      return;
    }

    if (trayEl && state.meta.fromSlot != null) {
      returnToTray(state.meta.fromSlot);
      return;
    }

    // ドラッグが枠に届かなかった場合でも、トレイからの操作なら次の空き枠へ入れる
    // （わずかな手ぶれで配置できなくなるのを防ぐ）
    if (state.meta.fromTray) {
      placeIntoActiveOrNext(state.meta.tileId);
    }
  }

  function getAnswerString() {
    return slots.map((s) => s.char || "").join("");
  }

  function checkAnswer() {
    return getAnswerString() === question.answer;
  }

  function getQuestion() {
    return question;
  }

  return {
    start,
    checkAnswer,
    getQuestion,
    getAnswerString,
  };
})();
