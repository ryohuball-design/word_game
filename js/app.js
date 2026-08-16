/**
 * アプリ全体：画面遷移・出題・結果・スタンプ表示
 */
(() => {
  const screens = {
    start: document.getElementById("screen-start"),
    game: document.getElementById("screen-game"),
    result: document.getElementById("screen-result"),
  };

  let allQuestions = [];
  let currentDifficulty = "easy";
  let recentIds = [];
  const RECENT_LIMIT = 5;

  async function init() {
    StampStore.load();
    updateStampUI();
    bindUI();

    try {
      const res = await fetch("data/questions.json");
      allQuestions = await res.json();
    } catch (err) {
      console.error("問題データの読み込みに失敗しました", err);
      allQuestions = [];
    }
  }

  function bindUI() {
    document.querySelectorAll("[data-difficulty]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentDifficulty = btn.dataset.difficulty;
        startRound();
      });
    });

    document.getElementById("btn-back").addEventListener("click", () => {
      showScreen("start");
      updateStampUI();
    });

    document.getElementById("btn-submit").addEventListener("click", onSubmit);
    document.getElementById("btn-next").addEventListener("click", () => startRound());
    document.getElementById("btn-home").addEventListener("click", () => {
      showScreen("start");
      updateStampUI();
    });
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      const active = key === name;
      el.classList.toggle("is-active", active);
      if (active) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
  }

  function updateStampUI() {
    const count = StampStore.getCount();
    const text = `きょうのスタンプ ${count} / ${StampStore.DAILY_GOAL}`;
    ["start-stamp-text", "game-stamp-text", "result-stamp-text"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });

    const goalReached = StampStore.isGoalReached();
    document.getElementById("goal-message").classList.toggle("is-hidden", !goalReached);
    document.getElementById("result-goal").classList.toggle("is-hidden", !goalReached);
  }

  function pickQuestion(difficulty) {
    const pool = allQuestions.filter((q) => q.difficulty === difficulty);
    if (pool.length === 0) return null;

    let candidates = pool.filter((q) => !recentIds.includes(q.id));
    if (candidates.length === 0) candidates = pool;

    const q = candidates[Math.floor(Math.random() * candidates.length)];
    recentIds.push(q.id);
    if (recentIds.length > RECENT_LIMIT) recentIds.shift();
    return q;
  }

  function startRound() {
    const q = pickQuestion(currentDifficulty);
    if (!q) {
      alert("もんだいがありません");
      return;
    }
    clearConfetti();
    Game.start(q);
    updateStampUI();
    showScreen("game");
  }

  function onSubmit() {
    const btn = document.getElementById("btn-submit");
    if (btn.disabled) return;

    AudioManager.playDecide();
    const correct = Game.checkAnswer();
    const q = Game.getQuestion();
    showResult(correct, q);
  }

  function showResult(correct, question) {
    const card = document.getElementById("result-card");
    const title = document.getElementById("result-title");
    const stamp = document.getElementById("result-stamp");
    const answer = document.getElementById("result-answer");
    const message = document.getElementById("result-message");
    const resultGoal = document.getElementById("result-goal");

    card.classList.toggle("is-correct", correct);
    card.classList.toggle("is-wrong", !correct);
    clearConfetti();

    if (correct) {
      const before = StampStore.getCount();
      StampStore.addOne();
      AudioManager.playCorrect();
      AudioManager.playStamp();
      AudioManager.playPraise();

      title.textContent = "すごいね！";
      stamp.classList.remove("is-hidden");
      // アニメ再開
      stamp.style.animation = "none";
      // eslint-disable-next-line no-unused-expressions
      stamp.offsetHeight;
      stamp.style.animation = "";
      answer.classList.add("is-hidden");
      message.textContent = "スタンプを ゲット！";
      spawnConfetti();

      if (StampStore.justReachedGoal(before) || StampStore.isGoalReached()) {
        resultGoal.classList.remove("is-hidden");
      } else {
        resultGoal.classList.add("is-hidden");
      }
    } else {
      AudioManager.playWrong();
      title.textContent = "ざんねん。";
      stamp.classList.add("is-hidden");
      answer.classList.remove("is-hidden");
      answer.textContent = `せいかい：${question.answer}`;
      message.textContent = "もういっかいやってみよう！";
      resultGoal.classList.toggle("is-hidden", !StampStore.isGoalReached());
    }

    updateStampUI();
    showScreen("result");
  }

  function spawnConfetti() {
    const layer = document.getElementById("confetti");
    layer.innerHTML = "";
    const colors = ["#ff8c42", "#6bcB77", "#4ea8de", "#f4d35e", "#f28482", "#9b5de5"];
    for (let i = 0; i < 28; i += 1) {
      const piece = document.createElement("i");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      layer.appendChild(piece);
    }
  }

  function clearConfetti() {
    const layer = document.getElementById("confetti");
    if (layer) layer.innerHTML = "";
  }

  document.addEventListener("DOMContentLoaded", init);
})();
