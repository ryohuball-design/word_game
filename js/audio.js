/**
 * 音声モジュール（Ver.1 はスタブ）
 * Ver.2 で音声ファイルを追加する想定
 */
const AudioManager = (() => {
  const enabled = false;

  const sounds = {
    decide: null,
    correct: null,
    wrong: null,
    stamp: null,
    praise: null,
  };

  function play(_name) {
    if (!enabled) return;
    // Ver.2: new Audio(`sounds/${_name}.mp3`).play()
  }

  return {
    play,
    playDecide: () => play("decide"),
    playCorrect: () => play("correct"),
    playWrong: () => play("wrong"),
    playStamp: () => play("stamp"),
    playPraise: () => play("praise"),
  };
})();
