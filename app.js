import { levels } from "./data.js";

const STORAGE_KEY = "linguist-state-v1";
const DEFAULT_SETTINGS = {
  sentencesPerRound: 5,
  autoRevealSeconds: 10,
};
const MAX_SENTENCES_PER_ROUND = 30;

function createDefaultLevelMetrics() {
  return Object.fromEntries(
    levels.map((level) => [
      level.id,
      {
        attempts: 0,
        recentScores: [],
        lastAttemptAt: null,
        completedRounds: 0,
      },
    ])
  );
}

const state = {
  currentScreen: "levels",
  selectedLevelId: levels[0]?.id ?? null,
  practiceIndex: 0,
  isTranslatedVisible: false,
  isShowingEnglish: false,
  timeLeft: DEFAULT_SETTINGS.autoRevealSeconds,
  timerId: null,
  attempts: 0,
  roundAnswered: 0,
  roundKnown: 0,
  roundSentences: [],
  levelBestScores: Object.fromEntries(levels.map((level) => [level.id, 0])),
  levelMetrics: createDefaultLevelMetrics(),
  settings: { ...DEFAULT_SETTINGS },
};

const levelsScreen = document.getElementById("levels-screen");
const practiceScreen = document.getElementById("practice-screen");
const statsScreen = document.getElementById("stats-screen");
const settingsScreen = document.getElementById("settings-screen");
const levelsList = document.getElementById("levels-list");

const practiceProgress = document.getElementById("practice-progress");
const timeLeftEl = document.getElementById("time-left");
const card = document.getElementById("practice-card");
const cardLang = document.getElementById("card-lang");
const cardText = document.getElementById("card-text");
const revealBtn = document.getElementById("reveal-btn");
const rating = document.getElementById("rating");

const navLevels = document.getElementById("nav-levels");
const navPractice = document.getElementById("nav-practice");
const navStats = document.getElementById("nav-stats");
const navSettings = document.getElementById("nav-settings");
const knownBtn = document.getElementById("known-btn");
const unknownBtn = document.getElementById("unknown-btn");
const roundResult = document.getElementById("round-result");
const roundResultText = document.getElementById("round-result-text");
const startNextRoundBtn = document.getElementById("start-next-round");
const exitPracticeBtn = document.getElementById("exit-practice");
const exitAfterRoundBtn = document.getElementById("exit-after-round");
const answerToast = document.getElementById("answer-toast");
const answerToastText = document.getElementById("answer-toast-text");
const statsOverall = document.getElementById("stats-overall");
const statsAttempts = document.getElementById("stats-attempts");
const statsLevels = document.getElementById("stats-levels");
const sentencesPerRoundInput = document.getElementById("sentences-per-round");
const sentencesPerRoundValue = document.getElementById("sentences-per-round-value");
const autoRevealSecondsInput = document.getElementById("auto-reveal-seconds");
const autoRevealSecondsValue = document.getElementById("auto-reveal-seconds-value");
const resetProgressBtn = document.getElementById("reset-progress");
let answerToastTimeoutId = null;

function setRatingLabels(isPastTense) {
  unknownBtn.textContent = isPastTense ? "Nem tudtam" : "Nem tudom";
  knownBtn.textContent = isPastTense ? "Tudtam" : "Tudom";
}

function getSelectedLevel() {
  return levels.find((lvl) => lvl.id === state.selectedLevelId) ?? levels[0];
}

function getCurrentSentence() {
  return state.roundSentences[state.practiceIndex];
}

function getBadgeMeta(score) {
  if (score === 100) {
    return { label: "Teljesítve", className: "completed" };
  }
  if (score > 0) {
    return { label: "Folyamatban", className: "progress" };
  }
  return { label: "Nem próbált", className: "new" };
}

function getLevelMetrics(levelId) {
  return (
    state.levelMetrics[levelId] ?? {
      attempts: 0,
      recentScores: [],
      lastAttemptAt: null,
      completedRounds: 0,
    }
  );
}

function recordLevelAttempt(levelId, knewIt) {
  const metrics = getLevelMetrics(levelId);

  state.levelMetrics[levelId] = {
    attempts: metrics.attempts + 1,
    recentScores: metrics.recentScores ?? [],
    lastAttemptAt: metrics.lastAttemptAt ?? null,
    completedRounds: metrics.completedRounds ?? 0,
  };
}

function recordCompletedRound(levelId, roundScorePercent) {
  const metrics = getLevelMetrics(levelId);
  const nextRecent = [...(metrics.recentScores ?? []), roundScorePercent].slice(-5);
  state.levelMetrics[levelId] = {
    ...metrics,
    recentScores: nextRecent,
    lastAttemptAt: new Date().toISOString(),
    completedRounds: (metrics.completedRounds ?? 0) + 1,
  };
}

function getRecentAverage(levelId) {
  const metrics = getLevelMetrics(levelId);
  if (!metrics.recentScores.length) return 0;
  const sum = metrics.recentScores.reduce((acc, value) => acc + value, 0);
  return Math.round(sum / metrics.recentScores.length);
}

function formatDateTime(dateIso) {
  if (!dateIso) return "-";
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("hu-HU");
}

function showScreen(screenName) {
  state.currentScreen = screenName;
  levelsScreen.classList.toggle("active", screenName === "levels");
  practiceScreen.classList.toggle("active", screenName === "practice");
  statsScreen.classList.toggle("active", screenName === "stats");
  settingsScreen.classList.toggle("active", screenName === "settings");
  navLevels.classList.toggle("active", screenName === "levels");
  navPractice.classList.toggle("active", screenName === "practice");
  navStats.classList.toggle("active", screenName === "stats");
  navSettings.classList.toggle("active", screenName === "settings");

  if (screenName === "practice") {
    startNewPracticeCard();
  } else if (screenName === "stats") {
    stopTimer();
    renderStats();
  } else if (screenName === "settings") {
    stopTimer();
    renderSettings();
  } else {
    stopTimer();
  }
}

function renderLevels() {
  levelsList.innerHTML = "";

  levels.forEach((level) => {
    const score = state.levelBestScores[level.id] ?? 0;
    const badge = getBadgeMeta(score);

    const cardEl = document.createElement("article");
    cardEl.className = "level-card clickable";
    cardEl.innerHTML = `
      <div class="row row-header">
        <div>
          <div class="muted">${level.id}. Szint</div>
          <h3>${level.title}</h3>
          <p class="muted">${level.description}</p>
        </div>
        <span class="badge ${badge.className}">${badge.label}</span>
      </div>
      <div class="row">
        <span class="muted">Legjobb eredmény</span>
        <strong>${score}%</strong>
      </div>
      <div class="progress"><div style="width:${score}%"></div></div>
    `;

    // All levels are open by default.
    cardEl.addEventListener("click", () => {
      state.selectedLevelId = level.id;
      startRound();
      showScreen("practice");
    });

    levelsList.appendChild(cardEl);
  });
}

function renderPracticeCard() {
  const sentence = getCurrentSentence();
  if (!sentence) return;

  if (state.isShowingEnglish) {
    cardLang.textContent = "ANGOL";
    cardText.textContent = sentence.en;
  } else {
    cardLang.textContent = "MAGYAR";
    cardText.textContent = sentence.hu;
  }

  const level = getSelectedLevel();
  practiceProgress.textContent = `${state.practiceIndex + 1} / ${getRoundLength(level)} mondat - ${level.title}`;
  timeLeftEl.textContent = String(state.timeLeft);
}

function startTimer() {
  stopTimer();
  state.timeLeft = state.settings.autoRevealSeconds;
  timeLeftEl.textContent = String(state.timeLeft);

  state.timerId = window.setInterval(() => {
    state.timeLeft -= 1;
    timeLeftEl.textContent = String(Math.max(0, state.timeLeft));

    if (state.timeLeft <= 0) {
      stopTimer();
      autoRevealOnTimeout();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function revealTranslation({ auto = false } = {}) {
  state.isTranslatedVisible = true;
  stopTimer();
  setRatingLabels(true);

  revealBtn.classList.add("hidden");
  rating.classList.remove("hidden");

  // Show english on reveal, then card click can always toggle both ways.
  state.isShowingEnglish = true;
  renderPracticeCard();
}

function autoRevealOnTimeout() {
  revealTranslation({ auto: true });
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startRound() {
  const level = getSelectedLevel();
  const roundLength = getRoundLength(level);
  state.roundSentences = shuffleArray(level.sentences).slice(0, roundLength);
  state.practiceIndex = 0;
  state.roundAnswered = 0;
  state.roundKnown = 0;
}

function startNewPracticeCard() {
  if (!state.roundSentences.length) {
    startRound();
  }

  state.isTranslatedVisible = false;
  state.isShowingEnglish = false;
  revealBtn.classList.remove("hidden");
  revealBtn.disabled = false;
  revealBtn.textContent = "Fordítás felfedése";
  setRatingLabels(false);
  rating.classList.remove("hidden");
  roundResult.classList.add("hidden");
  renderPracticeCard();
  startTimer();
}

function moveToNextSentence(knewIt) {
  const level = getSelectedLevel();
  const roundLength = state.roundSentences.length || getRoundLength(level);
  recordLevelAttempt(level.id, knewIt);
  state.attempts += 1;
  state.roundAnswered += 1;
  if (knewIt) state.roundKnown += 1;
  saveState();
  renderLevels();
  renderStats();

  if (state.roundAnswered >= roundLength) {
    const roundScorePercent = Math.round((state.roundKnown / roundLength) * 100);
    state.levelBestScores[level.id] = Math.max(
      state.levelBestScores[level.id] ?? 0,
      roundScorePercent
    );
    recordCompletedRound(level.id, roundScorePercent);
    saveState();
    renderLevels();
    renderStats();
    showRoundResult(roundLength);
    return;
  }

  state.practiceIndex += 1;
  startNewPracticeCard();
}

function hideAnswerToast() {
  if (answerToastTimeoutId) {
    window.clearTimeout(answerToastTimeoutId);
    answerToastTimeoutId = null;
  }
  answerToast.classList.remove("visible");
}

function showAnswerToast(correctAnswer) {
  if (answerToastTimeoutId) {
    window.clearTimeout(answerToastTimeoutId);
    answerToastTimeoutId = null;
  }
  answerToastText.textContent = correctAnswer;
  answerToast.classList.add("visible");

  answerToastTimeoutId = window.setTimeout(() => {
    hideAnswerToast();
  }, 1000);
}

function handleRating(knewIt) {
  const currentSentence = getCurrentSentence();
  if (!currentSentence) return;

  // If user answers before revealing/flip, briefly show the correct answer.
  if (!state.isTranslatedVisible) {
    stopTimer();
    setRatingLabels(true);
    revealBtn.classList.add("hidden");
    state.isTranslatedVisible = true;
    showAnswerToast(currentSentence.en);
  }

  moveToNextSentence(knewIt);
}

function showRoundResult(roundLength) {
  stopTimer();
  revealBtn.classList.add("hidden");
  rating.classList.add("hidden");
  roundResult.classList.remove("hidden");
  const percent = Math.round((state.roundKnown / roundLength) * 100);
  roundResultText.textContent = `Eredmény: ${state.roundKnown} / ${roundLength} (${percent}%).`;
}

function startNextRound() {
  startRound();
  startNewPracticeCard();
}

function resetPracticeState() {
  stopTimer();
  state.practiceIndex = 0;
  state.roundAnswered = 0;
  state.roundKnown = 0;
  state.roundSentences = [];
}

function exitToLevels() {
  resetPracticeState();
  showScreen("levels");
}

function hasIncompleteRound() {
  if (state.currentScreen !== "practice") return false;
  const level = getSelectedLevel();
  const roundLength = state.roundSentences.length || getRoundLength(level);
  return state.roundSentences.length > 0 && state.roundAnswered < roundLength;
}

function requestLeavePractice(targetScreen) {
  if (hasIncompleteRound()) {
    const confirmed = window.confirm(
      "A kör még nincs befejezve. Biztosan kilépsz? A kör újraindul majd."
    );
    if (!confirmed) return;
  }
  resetPracticeState();
  showScreen(targetScreen);
}

function requestExitToLevels() {
  requestLeavePractice("levels");
}

function getRoundLength(level) {
  return Math.min(
    level.sentences.length,
    Math.max(1, state.settings.sentencesPerRound),
    MAX_SENTENCES_PER_ROUND
  );
}

function renderStats() {
  const scores = levels.map((level) => state.levelBestScores[level.id] ?? 0);
  const overall = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  statsOverall.textContent = `${overall}%`;
  statsAttempts.textContent = String(state.attempts);

  statsLevels.innerHTML = "";
  levels.forEach((level) => {
    const score = state.levelBestScores[level.id] ?? 0;
    const badge = getBadgeMeta(score);
    const metrics = getLevelMetrics(level.id);
    const recentAverage = getRecentAverage(level.id);
    const lastAttemptText = formatDateTime(metrics.lastAttemptAt);

    const item = document.createElement("article");
    item.className = "level-card";
    item.innerHTML = `
      <div class="row row-header">
        <div>
          <div class="muted">${level.id}. Szint</div>
          <h3>${level.title}</h3>
        </div>
        <span class="badge ${badge.className}">${badge.label}</span>
      </div>
      <div class="row">
        <span class="muted">Legjobb eredmény</span>
        <strong>${score}%</strong>
      </div>
      <div class="row">
        <span class="muted">Utolsó 5 kör átlaga</span>
        <strong>${recentAverage}%</strong>
      </div>
      <div class="row">
        <span class="muted">Mondatok száma</span>
        <strong>${metrics.attempts}</strong>
      </div>
      <div class="row">
        <span class="muted">Körök száma (befejezett)</span>
        <strong>${metrics.completedRounds ?? 0}</strong>
      </div>
      <div class="row">
        <span class="muted">Legutóbbi próbálkozás</span>
        <strong>${lastAttemptText}</strong>
      </div>
      <div class="progress"><div style="width:${score}%"></div></div>
    `;
    statsLevels.appendChild(item);
  });
}

function renderSettings() {
  sentencesPerRoundInput.value = String(state.settings.sentencesPerRound);
  sentencesPerRoundValue.textContent = String(state.settings.sentencesPerRound);
  autoRevealSecondsInput.value = String(state.settings.autoRevealSeconds);
  autoRevealSecondsValue.textContent = String(state.settings.autoRevealSeconds);
}

function saveState() {
  const persistableState = {
    levelBestScores: state.levelBestScores,
    levelMetrics: state.levelMetrics,
    attempts: state.attempts,
    settings: state.settings,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState));
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state.levelBestScores = {
        ...state.levelBestScores,
        ...(parsed.levelBestScores ?? {}),
      };
      state.levelMetrics = {
        ...createDefaultLevelMetrics(),
        ...(parsed.levelMetrics ?? {}),
      };
      state.attempts = Number(parsed.attempts ?? 0);
      state.settings = {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
      };
      state.timeLeft = state.settings.autoRevealSeconds;
    }
  } catch (error) {
    console.error("Nem sikerült betölteni a mentett állapotot.", error);
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service worker regisztráció sikertelen:", error);
    });
  }
}

revealBtn.addEventListener("click", () => {
  if (!state.isTranslatedVisible) {
    revealTranslation();
  }
});

card.addEventListener("click", () => {
  if (!state.isTranslatedVisible) {
    stopTimer();
    state.isTranslatedVisible = true;
    setRatingLabels(true);
    revealBtn.classList.add("hidden");
    rating.classList.remove("hidden");
  }
  // Card can always be flipped back and forth by click.
  state.isShowingEnglish = !state.isShowingEnglish;
  renderPracticeCard();
});

knownBtn.addEventListener("click", () => handleRating(true));
unknownBtn.addEventListener("click", () => handleRating(false));
startNextRoundBtn.addEventListener("click", startNextRound);
exitPracticeBtn.addEventListener("click", requestExitToLevels);
exitAfterRoundBtn.addEventListener("click", requestExitToLevels);

navLevels.addEventListener("click", () => {
  if (state.currentScreen === "practice") {
    requestLeavePractice("levels");
    return;
  }
  showScreen("levels");
});
navPractice.addEventListener("click", () => showScreen("practice"));
navStats.addEventListener("click", () => {
  if (state.currentScreen === "practice") {
    requestLeavePractice("stats");
    return;
  }
  showScreen("stats");
});
navSettings.addEventListener("click", () => {
  if (state.currentScreen === "practice") {
    requestLeavePractice("settings");
    return;
  }
  showScreen("settings");
});

sentencesPerRoundInput.addEventListener("input", (event) => {
  const target = event.target;
  const clamped = Math.min(MAX_SENTENCES_PER_ROUND, Math.max(1, Number(target.value)));
  state.settings.sentencesPerRound = clamped;
  target.value = String(clamped);
  sentencesPerRoundValue.textContent = String(clamped);
  state.practiceIndex = 0;
  state.roundSentences = [];
  saveState();
});

autoRevealSecondsInput.addEventListener("input", (event) => {
  const target = event.target;
  state.settings.autoRevealSeconds = Number(target.value);
  autoRevealSecondsValue.textContent = target.value;
  state.timeLeft = state.settings.autoRevealSeconds;
  renderPracticeCard();
  saveState();
});

resetProgressBtn.addEventListener("click", () => {
  state.levelBestScores = Object.fromEntries(levels.map((level) => [level.id, 0]));
  state.levelMetrics = createDefaultLevelMetrics();
  state.attempts = 0;
  saveState();
  renderLevels();
  renderStats();
});

loadState();
renderLevels();
renderStats();
renderSettings();
renderPracticeCard();
registerServiceWorker();
