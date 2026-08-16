/**
 * スタンプ管理（localStorage + 日付リセット）
 */
const StampStore = (() => {
  const KEY = "mojinarabe_stamps_v1";
  const DAILY_GOAL = 10;

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { count: 0, date: todayKey() };
      const data = JSON.parse(raw);
      if (!data || typeof data.count !== "number" || typeof data.date !== "string") {
        return { count: 0, date: todayKey() };
      }
      if (data.date !== todayKey()) {
        const reset = { count: 0, date: todayKey() };
        save(reset);
        return reset;
      }
      return data;
    } catch {
      return { count: 0, date: todayKey() };
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function getCount() {
    return load().count;
  }

  function addOne() {
    const data = load();
    data.count += 1;
    data.date = todayKey();
    save(data);
    return data.count;
  }

  function isGoalReached() {
    return getCount() >= DAILY_GOAL;
  }

  function justReachedGoal(previousCount) {
    return previousCount < DAILY_GOAL && getCount() >= DAILY_GOAL;
  }

  return {
    DAILY_GOAL,
    getCount,
    addOne,
    isGoalReached,
    justReachedGoal,
    load,
  };
})();
