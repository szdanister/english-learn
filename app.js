import { levels } from "./data.js";

const STORAGE_KEY = "linguist-state-v1";
const DEFAULT_SETTINGS = {
  sentencesPerRound: 15,
  autoRevealSeconds: 15,
  toastDurationSeconds: 1,
  darkMode: false,
  ttsEnabled: true,
  englishVoiceURI: "",
  hungarianTtsEnabled: false,
  hungarianVoiceURI: "",
};
const MAX_SENTENCES_PER_ROUND = 30;
const PRACTICE_TYPES = {
  single: "single",
  mixed: "mixed",
};
const PRACTICE_TYPE_LABELS = {
  single: "Csak ez a szint",
  mixed: "Vegyes",
};

function createDefaultTypeMetrics() {
  return {
    attempts: 0,
    recentScores: [],
    lastAttemptAt: null,
    completedRounds: 0,
  };
}

function createDefaultLevelMetrics() {
  return Object.fromEntries(
    levels.map((level) => [
      level.id,
      {
        [PRACTICE_TYPES.single]: createDefaultTypeMetrics(),
        [PRACTICE_TYPES.mixed]: createDefaultTypeMetrics(),
      },
    ])
  );
}

function createDefaultBestScores() {
  return Object.fromEntries(
    levels.map((level) => [
      level.id,
      {
        [PRACTICE_TYPES.single]: 0,
        [PRACTICE_TYPES.mixed]: 0,
      },
    ])
  );
}

const state = {
  currentScreen: "levels",
  selectedLevelId: levels[0]?.id ?? null,
  currentPracticeType: PRACTICE_TYPES.single,
  practiceIndex: 0,
  isTranslatedVisible: false,
  isShowingEnglish: false,
  timeLeft: DEFAULT_SETTINGS.autoRevealSeconds,
  timerId: null,
  attempts: 0,
  roundAnswered: 0,
  roundKnown: 0,
  roundSentences: [],
  roundUnknowns: [],
  roundKnowns: [],
  levelBestScores: createDefaultBestScores(),
  levelMetrics: createDefaultLevelMetrics(),
  settings: { ...DEFAULT_SETTINGS },
  lastSpokenSignature: "",
  isAdvancing: false,
  hasSpokenAnswerForCurrentCard: false,
};

const levelsScreen = document.getElementById("levels-screen");
const practiceScreen = document.getElementById("practice-screen");
const statsScreen = document.getElementById("stats-screen");
const settingsScreen = document.getElementById("settings-screen");
const levelsList = document.getElementById("levels-list");
const totalSentencesCount = document.getElementById("total-sentences-count");

const practiceProgress = document.getElementById("practice-progress");
const practiceContext = document.getElementById("practice-context");
const practiceTimer = document.getElementById("practice-timer");
const timeLeftEl = document.getElementById("time-left");
const card = document.getElementById("practice-card");
const cardTextHu = document.getElementById("card-text-hu");
const cardTextEn = document.getElementById("card-text-en");
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
const roundUnknownWrap = document.getElementById("round-unknown-wrap");
const roundUnknownList = document.getElementById("round-unknown-list");
const roundKnownWrap = document.getElementById("round-known-wrap");
const roundKnownList = document.getElementById("round-known-list");
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
const toastDurationSecondsInput = document.getElementById("toast-duration-seconds");
const toastDurationSecondsValue = document.getElementById("toast-duration-seconds-value");
const darkModeToggle = document.getElementById("dark-mode-toggle");
const ttsEnabledToggle = document.getElementById("tts-enabled-toggle");
const englishVoiceSelect = document.getElementById("english-voice-select");
const hungarianTtsEnabledToggle = document.getElementById("hungarian-tts-enabled-toggle");
const hungarianVoiceSelect = document.getElementById("hungarian-voice-select");
const resetProgressBtn = document.getElementById("reset-progress");
let answerToastTimeoutId = null;
let availableEnglishVoices = [];
let availableHungarianVoices = [];

function clampToastDuration(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_SETTINGS.toastDurationSeconds;
  return Math.min(5, Math.max(1, Math.round(numeric * 10) / 10));
}

function canUseSpeechSynthesis() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function getVoicesByLanguage(allVoices, langPrefix) {
  return allVoices.filter((voice) =>
    voice?.lang?.toLowerCase().startsWith(langPrefix.toLowerCase())
  );
}

function getSentenceSpeakKey() {
  return `${state.selectedLevelId}:${state.currentPracticeType}:${state.practiceIndex}`;
}

function scoreVoice(voice) {
  const lang = (voice.lang ?? "").toLowerCase();
  const name = (voice.name ?? "").toLowerCase();
  let score = 0;

  if (lang === "en-gb") score += 60;
  if (lang.startsWith("en-gb")) score += 35;
  if (lang.startsWith("en")) score += 10;
  if (voice.localService) score += 5;
  if (
    name.includes("female") ||
    name.includes("woman") ||
    name.includes("zira") ||
    name.includes("libby") ||
    name.includes("hazel") ||
    name.includes("sonia") ||
    name.includes("sara")
  ) {
    score += 25;
  }

  return score;
}

function compareVoices(a, b) {
  return scoreVoice(b) - scoreVoice(a);
}

function scoreHungarianVoice(voice) {
  const lang = (voice.lang ?? "").toLowerCase();
  let score = 0;
  if (lang === "hu-hu") score += 60;
  if (lang.startsWith("hu-hu")) score += 35;
  if (lang.startsWith("hu")) score += 10;
  if (voice.localService) score += 5;
  return score;
}

function compareHungarianVoices(a, b) {
  return scoreHungarianVoice(b) - scoreHungarianVoice(a);
}

function pickVoice(voices, selectedUri, compareFn) {
  if (!voices.length) return null;
  if (selectedUri) {
    const exact = voices.find((voice) => voice.voiceURI === selectedUri);
    if (exact) return exact;
  }
  return [...voices].sort(compareFn)[0] ?? null;
}

function getSelectedEnglishVoice() {
  return pickVoice(availableEnglishVoices, state.settings.englishVoiceURI, compareVoices);
}

function getSelectedHungarianVoice() {
  return pickVoice(
    availableHungarianVoices,
    state.settings.hungarianVoiceURI,
    compareHungarianVoices
  );
}

function getVoiceLabel(voice) {
  const localTag = voice.localService ? "offline" : "online";
  return `${voice.name} (${voice.lang}, ${localTag})`;
}

function stopSpeech() {
  if (!canUseSpeechSynthesis()) return;
  window.speechSynthesis.cancel();
}

function speakAndWait(utterance, timeoutMs = 7000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve();
    };
    const timeoutId = window.setTimeout(finish, timeoutMs);
    utterance.onend = finish;
    utterance.onerror = finish;
    stopSpeech();
    window.speechSynthesis.speak(utterance);
  });
}

async function speakEnglish(text, reason = "general", options = {}) {
  const phrase = String(text ?? "").trim();
  if (!phrase || !canUseSpeechSynthesis()) return;
  if (!state.settings.ttsEnabled) return;
  if (state.currentScreen !== "practice") return;

  const signature = `${reason}:${getSentenceSpeakKey()}:${phrase}`;
  if (!options.force && state.lastSpokenSignature === signature) return;
  state.lastSpokenSignature = signature;

  const utterance = new SpeechSynthesisUtterance(phrase);
  const voice = getSelectedEnglishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || "en-GB";
  } else {
    utterance.lang = "en-GB";
  }
  utterance.rate = 1;
  utterance.pitch = 1;

  if (options.waitForEnd) {
    await speakAndWait(utterance);
    return;
  }

  stopSpeech();
  window.speechSynthesis.speak(utterance);
}

function speakHungarian(text, reason = "general") {
  const phrase = String(text ?? "").trim();
  if (!phrase || !canUseSpeechSynthesis()) return;
  if (!state.settings.hungarianTtsEnabled) return;
  if (state.currentScreen !== "practice") return;

  const signature = `${reason}:${getSentenceSpeakKey()}:${phrase}`;
  if (state.lastSpokenSignature === signature) return;
  state.lastSpokenSignature = signature;

  const utterance = new SpeechSynthesisUtterance(phrase);
  const voice = getSelectedHungarianVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || "hu-HU";
  } else {
    utterance.lang = "hu-HU";
  }
  utterance.rate = 1;
  utterance.pitch = 1;

  stopSpeech();
  window.speechSynthesis.speak(utterance);
}

function renderVoiceSelectOptions(selectEl, options) {
  if (!selectEl) return;

  selectEl.innerHTML = "";
  if (!canUseSpeechSynthesis()) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "A böngésző nem támogatja a felolvasást";
    selectEl.appendChild(option);
    selectEl.disabled = true;
    return;
  }

  if (!options.voices.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = options.noVoicesText;
    selectEl.appendChild(option);
    selectEl.disabled = true;
    return;
  }

  selectEl.disabled = !options.enabled;
  options.voices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.voiceURI;
    option.textContent = getVoiceLabel(voice);
    selectEl.appendChild(option);
  });

  const preferred = options.getSelectedVoice();
  const nextUri = preferred?.voiceURI ?? "";
  selectEl.value = nextUri;
  if (options.getStoredUri() !== nextUri) {
    options.setStoredUri(nextUri);
    saveState();
  }
}

function refreshAvailableVoices() {
  if (!canUseSpeechSynthesis()) {
    availableEnglishVoices = [];
    renderSettings();
    return;
  }

  const all = window.speechSynthesis.getVoices();
  availableEnglishVoices = getVoicesByLanguage(all, "en").sort(compareVoices);
  availableHungarianVoices = getVoicesByLanguage(all, "hu").sort(compareHungarianVoices);
  renderSettings();
}

function initializeSpeechVoices() {
  if (!canUseSpeechSynthesis()) return;

  refreshAvailableVoices();
  window.speechSynthesis.addEventListener("voiceschanged", refreshAvailableVoices);
  window.setTimeout(refreshAvailableVoices, 0);
}

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

function getPracticeContextLabel(level, modeLabel) {
  return `${level.id}. szint - ${level.title} - ${modeLabel}`;
}

function getBestScore(levelId, type) {
  return state.levelBestScores[levelId]?.[type] ?? 0;
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

function getTypeMetrics(levelId, type) {
  return (
    state.levelMetrics[levelId]?.[type] ?? {
      attempts: 0,
      recentScores: [],
      lastAttemptAt: null,
      completedRounds: 0,
    }
  );
}

function setTypeMetrics(levelId, type, nextValue) {
  state.levelMetrics[levelId] = {
    ...(state.levelMetrics[levelId] ?? {}),
    [type]: nextValue,
  };
}

function recordLevelAttempt(levelId, type) {
  const metrics = getTypeMetrics(levelId, type);
  setTypeMetrics(levelId, type, {
    attempts: metrics.attempts + 1,
    recentScores: metrics.recentScores ?? [],
    lastAttemptAt: metrics.lastAttemptAt ?? null,
    completedRounds: metrics.completedRounds ?? 0,
  });
}

function recordCompletedRound(levelId, type, roundScorePercent) {
  const metrics = getTypeMetrics(levelId, type);
  const nextRecent = [...(metrics.recentScores ?? []), roundScorePercent].slice(-5);
  setTypeMetrics(levelId, type, {
    ...metrics,
    recentScores: nextRecent,
    lastAttemptAt: new Date().toISOString(),
    completedRounds: (metrics.completedRounds ?? 0) + 1,
  });
}

function getRecentAverage(levelId, type) {
  const metrics = getTypeMetrics(levelId, type);
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

function getLevelById(levelId) {
  return levels.find((lvl) => lvl.id === levelId) ?? null;
}

function getEffectiveRoundLength(level, poolLength) {
  return Math.min(
    poolLength,
    Math.max(1, state.settings.sentencesPerRound),
    MAX_SENTENCES_PER_ROUND
  );
}

function annotateSentencePool(level) {
  if (state.currentPracticeType === PRACTICE_TYPES.single) {
    return level.sentences.map((sentence) => ({
      ...sentence,
      __sourceLevelId: level.id,
      __sourceLevelTitle: level.title,
    }));
  }
  return levels
    .filter((item) => item.id <= level.id)
    .flatMap((item) =>
      item.sentences.map((sentence) => ({
        ...sentence,
        __sourceLevelId: item.id,
        __sourceLevelTitle: item.title,
      }))
    );
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
    stopSpeech();
    renderStats();
  } else if (screenName === "settings") {
    stopTimer();
    stopSpeech();
    renderSettings();
  } else {
    stopTimer();
    stopSpeech();
  }
}

function startPracticeFor(levelId, practiceType) {
  state.selectedLevelId = levelId;
  state.currentPracticeType = practiceType;
  startRound();
  showScreen("practice");
}

function escapeHtml(raw) {
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLevels() {
  levelsList.innerHTML = "";
  const sentenceTotal = levels.reduce((sum, level) => sum + level.sentences.length, 0);
  totalSentencesCount.textContent = String(sentenceTotal);

  levels.forEach((level) => {
    const singleBest = getBestScore(level.id, PRACTICE_TYPES.single);
    const mixedBest = getBestScore(level.id, PRACTICE_TYPES.mixed);
    const isMixedAvailable = level.id > 1;
    const heatSourcePct = isMixedAvailable ? mixedBest : singleBest;
    const steppedHeat = Math.min(100, Math.round(heatSourcePct / 5) * 5);
    const heatColor = getMixedHeatColor(steppedHeat);

    const cardEl = document.createElement("article");
    cardEl.className = "level-card";
    cardEl.style.setProperty("--level-heat", heatColor);
    cardEl.innerHTML = `
      <div class="row row-header">
        <div>
          <div class="level-index muted">${level.id}. Szint</div>
          <h3>${escapeHtml(level.title)}</h3>
          ${
            level.description
              ? `<p class="level-description muted">${escapeHtml(level.description)}</p>`
              : ""
          }
        </div>
        <span class="badge level-sentence-badge">${level.sentences.length} mondat</span>
      </div>
      <div class="row">
        <span class="muted">Legjobb eredmény</span>
        <strong>${singleBest}%</strong>
      </div>
      ${
        isMixedAvailable
          ? `<div class="row">
        <span class="muted">Legjobb eredmény (vegyes)</span>
        <strong>${mixedBest}%</strong>
      </div>`
          : ""
      }
      <div class="progress"><div class="level-progress-fill" style="width:${heatSourcePct}%"></div></div>
      <div class="level-buttons ${isMixedAvailable ? "" : "single-only"}">
        <button class="level-start-btn start-mode-btn" data-level-id="${level.id}" data-mode="${PRACTICE_TYPES.single}">
          Csak ez a szint
        </button>
        ${
          isMixedAvailable
            ? `<button class="level-start-btn mixed start-mode-btn" data-level-id="${level.id}" data-mode="${PRACTICE_TYPES.mixed}">
          Vegyes
        </button>`
            : ""
        }
      </div>
    `;
    levelsList.appendChild(cardEl);
  });

  document.querySelectorAll(".start-mode-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const target = event.currentTarget;
      const levelId = Number(target.dataset.levelId);
      const mode = target.dataset.mode;
      if (!levelId || !mode) return;
      startPracticeFor(levelId, mode);
    });
  });
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const bigint = Number.parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (value) => value.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const mix = (x, y) => Math.round(x + (y - x) * t);
  return rgbToHex({
    r: mix(ca.r, cb.r),
    g: mix(ca.g, cb.g),
    b: mix(ca.b, cb.b),
  });
}

function getMixedHeatColor(steppedMixedPercent) {
  if (steppedMixedPercent >= 100) {
    return "#266d00";
  }
  const t = steppedMixedPercent / 95;
  return mixHex("#e6f2ff", "#005da7", Math.min(1, Math.max(0, t)));
}

function renderPracticeCard() {
  const sentence = getCurrentSentence();
  if (!sentence) return;

  cardTextHu.textContent = sentence.hu;
  cardTextEn.textContent = sentence.en;
  card.classList.toggle("flipped", state.isShowingEnglish);

  const level = getSelectedLevel();
  const modeLabel = PRACTICE_TYPE_LABELS[state.currentPracticeType] ?? "";
  const poolLength = state.roundSentences.length || annotateSentencePool(level).length;
  const roundTotal = getEffectiveRoundLength(level, poolLength);
  practiceContext.textContent = getPracticeContextLabel(level, modeLabel);
  practiceProgress.textContent = `${state.practiceIndex + 1} / ${roundTotal} mondat`;
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

function revealTranslation() {
  state.isTranslatedVisible = true;
  stopTimer();
  setRatingLabels(true);
  revealBtn.classList.add("hidden");
  rating.classList.remove("hidden");
  state.isShowingEnglish = true;
  renderPracticeCard();
  const sentence = getCurrentSentence();
  if (sentence?.en) {
    speakEnglish(sentence.en, "reveal");
    state.hasSpokenAnswerForCurrentCard = true;
  }
}

function autoRevealOnTimeout() {
  revealTranslation();
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
  const pool = annotateSentencePool(level);
  const roundLength = getEffectiveRoundLength(level, pool.length);
  state.roundSentences = shuffleArray(pool).slice(0, roundLength);
  state.practiceIndex = 0;
  state.roundAnswered = 0;
  state.roundKnown = 0;
  state.roundUnknowns = [];
  state.roundKnowns = [];
}

function startNewPracticeCard() {
  if (!state.roundSentences.length) {
    startRound();
  }
  state.isTranslatedVisible = false;
  state.isShowingEnglish = false;
  state.isAdvancing = false;
  state.hasSpokenAnswerForCurrentCard = false;
  revealBtn.classList.remove("hidden");
  revealBtn.disabled = false;
  revealBtn.textContent = "Fordítás felfedése";
  setRatingLabels(false);
  rating.classList.remove("hidden");
  knownBtn.disabled = false;
  unknownBtn.disabled = false;
  roundResult.classList.add("hidden");
  practiceTimer.classList.remove("hidden");
  practiceProgress.classList.remove("hidden");
  card.classList.remove("hidden");
  roundUnknownWrap.classList.add("hidden");
  roundUnknownList.innerHTML = "";
  roundKnownWrap.classList.add("hidden");
  roundKnownList.innerHTML = "";
  renderPracticeCard();
  startTimer();
  state.lastSpokenSignature = "";
  const sentence = getCurrentSentence();
  if (sentence?.hu) {
    speakHungarian(sentence.hu, "card-start-hu");
  }
}

function moveToNextSentence(knewIt) {
  const level = getSelectedLevel();
  const type = state.currentPracticeType;
  const roundLength = state.roundSentences.length;
  recordLevelAttempt(level.id, type);
  state.attempts += 1;
  state.roundAnswered += 1;
  if (knewIt) state.roundKnown += 1;
  const sentence = getCurrentSentence();
  if (sentence) {
    const sourceLevelId = sentence.__sourceLevelId ?? level.id;
    const sourceLevel = getLevelById(sourceLevelId) ?? level;
    const roundSentenceEntry = {
      hu: sentence.hu,
      en: sentence.en,
      sourceLevelId: sourceLevel.id,
      sourceLevelTitle: sentence.__sourceLevelTitle ?? sourceLevel.title,
    };
    if (knewIt) {
      state.roundKnowns.push(roundSentenceEntry);
    } else {
      state.roundUnknowns.push(roundSentenceEntry);
    }
  }
  saveState();
  renderLevels();
  renderStats();

  if (state.roundAnswered >= roundLength) {
    const roundScorePercent = Math.round((state.roundKnown / roundLength) * 100);
    const prevBest = getBestScore(level.id, type);
    state.levelBestScores[level.id] = {
      ...(state.levelBestScores[level.id] ?? {}),
      [type]: Math.max(prevBest, roundScorePercent),
    };
    recordCompletedRound(level.id, type, roundScorePercent);
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
  }, Math.round(state.settings.toastDurationSeconds * 1000));
}

async function handleRating(knewIt) {
  if (state.isAdvancing) return;
  const currentSentence = getCurrentSentence();
  if (!currentSentence) return;

  if (!state.isTranslatedVisible) {
    stopTimer();
    setRatingLabels(true);
    revealBtn.classList.add("hidden");
    state.isTranslatedVisible = true;
    showAnswerToast(currentSentence.en);
  }

  state.isAdvancing = true;
  knownBtn.disabled = true;
  unknownBtn.disabled = true;

  try {
    if (!state.hasSpokenAnswerForCurrentCard) {
      await speakEnglish(currentSentence.en, "answer-before-next", {
        force: true,
        waitForEnd: true,
      });
      state.hasSpokenAnswerForCurrentCard = true;
    }
    moveToNextSentence(knewIt);
  } finally {
    state.isAdvancing = false;
    knownBtn.disabled = false;
    unknownBtn.disabled = false;
  }
}

function showRoundResult(roundLength) {
  stopTimer();
  stopSpeech();
  revealBtn.classList.add("hidden");
  rating.classList.add("hidden");
  practiceTimer.classList.add("hidden");
  practiceProgress.classList.add("hidden");
  card.classList.add("hidden");
  roundResult.classList.remove("hidden");
  const percent = Math.round((state.roundKnown / roundLength) * 100);
  const modeLabel = PRACTICE_TYPE_LABELS[state.currentPracticeType] ?? "";
  const level = getSelectedLevel();
  const contextLabel = getPracticeContextLabel(level, modeLabel);
  practiceContext.textContent = contextLabel;
  roundResultText.textContent = `Eredmény: ${percent}% (${state.roundKnown}/${roundLength})`;

  renderRoundSentenceList(state.roundUnknowns, roundUnknownWrap, roundUnknownList);
  renderRoundSentenceList(state.roundKnowns, roundKnownWrap, roundKnownList);
}

function renderRoundSentenceList(items, wrapEl, listEl) {
  listEl.innerHTML = "";
  if (!items.length) {
    wrapEl.classList.add("hidden");
    return;
  }
  wrapEl.classList.remove("hidden");
  items.forEach((item) => {
    const li = document.createElement("li");

    const huLine = document.createElement("div");
    huLine.className = "unknown-hu";
    huLine.textContent = item.hu;

    const enLine = document.createElement("div");
    enLine.className = "unknown-en";
    enLine.textContent = item.en;

    const metaLine = document.createElement("div");
    metaLine.className = "unknown-meta";
    metaLine.textContent = `(${item.sourceLevelId}. szint - ${item.sourceLevelTitle})`;

    li.appendChild(huLine);
    li.appendChild(enLine);
    li.appendChild(metaLine);
    listEl.appendChild(li);
  });
}

function startNextRound() {
  startRound();
  startNewPracticeCard();
}

function resetPracticeState() {
  stopTimer();
  stopSpeech();
  state.lastSpokenSignature = "";
  state.practiceIndex = 0;
  state.roundAnswered = 0;
  state.roundKnown = 0;
  state.roundSentences = [];
  state.roundUnknowns = [];
  state.roundKnowns = [];
}

function hasIncompleteRound() {
  if (state.currentScreen !== "practice") return false;
  const level = getSelectedLevel();
  const poolLength = annotateSentencePool(level).length;
  const roundLength = getEffectiveRoundLength(level, poolLength);
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

function renderStats() {
  const bestValues = levels.flatMap((level) => [
    getBestScore(level.id, PRACTICE_TYPES.single),
    getBestScore(level.id, PRACTICE_TYPES.mixed),
  ]);
  const overall = bestValues.length
    ? Math.round(bestValues.reduce((sum, value) => sum + value, 0) / bestValues.length)
    : 0;
  statsOverall.textContent = `${overall}%`;
  statsAttempts.textContent = String(state.attempts);

  statsLevels.innerHTML = "";
  levels.forEach((level) => {
    const singleBest = getBestScore(level.id, PRACTICE_TYPES.single);
    const mixedBest = getBestScore(level.id, PRACTICE_TYPES.mixed);
    const badge = getBadgeMeta(Math.max(singleBest, mixedBest));
    const singleMetrics = getTypeMetrics(level.id, PRACTICE_TYPES.single);
    const mixedMetrics = getTypeMetrics(level.id, PRACTICE_TYPES.mixed);

    const item = document.createElement("article");
    item.className = "level-card";
    const statsBarPct = Math.max(singleBest, mixedBest);
    const statsSteppedHeat = Math.min(100, Math.round(statsBarPct / 5) * 5);
    item.style.setProperty("--level-heat", getMixedHeatColor(statsSteppedHeat));
    item.innerHTML = `
      <div class="row row-header">
        <div>
          <div class="muted">${level.id}. Szint</div>
          <h3>${level.title}</h3>
        </div>
        <span class="badge ${badge.className}">${badge.label}</span>
      </div>
      <div class="row">
        <span class="muted">Legjobb eredmény (csak ez a szint)</span>
        <strong>${singleBest}%</strong>
      </div>
      <div class="row">
        <span class="muted">Legjobb eredmény (vegyes)</span>
        <strong>${mixedBest}%</strong>
      </div>
      <div class="row">
        <span class="muted">Utolsó 5 kör átlaga (csak ez a szint)</span>
        <strong>${getRecentAverage(level.id, PRACTICE_TYPES.single)}%</strong>
      </div>
      <div class="row">
        <span class="muted">Utolsó 5 kör átlaga (vegyes)</span>
        <strong>${getRecentAverage(level.id, PRACTICE_TYPES.mixed)}%</strong>
      </div>
      <div class="row">
        <span class="muted">Mondatok száma (csak ez a szint)</span>
        <strong>${singleMetrics.attempts}</strong>
      </div>
      <div class="row">
        <span class="muted">Mondatok száma (vegyes)</span>
        <strong>${mixedMetrics.attempts}</strong>
      </div>
      <div class="row">
        <span class="muted">Körök száma (befejezett, csak ez a szint)</span>
        <strong>${singleMetrics.completedRounds ?? 0}</strong>
      </div>
      <div class="row">
        <span class="muted">Körök száma (befejezett, vegyes)</span>
        <strong>${mixedMetrics.completedRounds ?? 0}</strong>
      </div>
      <div class="row">
        <span class="muted">Legutóbbi próbálkozás (csak ez a szint)</span>
        <strong>${formatDateTime(singleMetrics.lastAttemptAt)}</strong>
      </div>
      <div class="row">
        <span class="muted">Legutóbbi próbálkozás (vegyes)</span>
        <strong>${formatDateTime(mixedMetrics.lastAttemptAt)}</strong>
      </div>
      <div class="progress"><div class="level-progress-fill" style="width:${Math.max(singleBest, mixedBest)}%"></div></div>
    `;
    statsLevels.appendChild(item);
  });
}

function renderSettings() {
  sentencesPerRoundInput.value = String(state.settings.sentencesPerRound);
  sentencesPerRoundValue.textContent = String(state.settings.sentencesPerRound);
  autoRevealSecondsInput.value = String(state.settings.autoRevealSeconds);
  autoRevealSecondsValue.textContent = String(state.settings.autoRevealSeconds);
  toastDurationSecondsInput.value = state.settings.toastDurationSeconds.toFixed(1);
  toastDurationSecondsValue.textContent = state.settings.toastDurationSeconds.toFixed(1);
  darkModeToggle.checked = Boolean(state.settings.darkMode);
  ttsEnabledToggle.checked = Boolean(state.settings.ttsEnabled);
  hungarianTtsEnabledToggle.checked = Boolean(state.settings.hungarianTtsEnabled);
  renderVoiceSelectOptions(englishVoiceSelect, {
    voices: availableEnglishVoices,
    enabled: state.settings.ttsEnabled,
    getSelectedVoice: getSelectedEnglishVoice,
    getStoredUri: () => state.settings.englishVoiceURI,
    setStoredUri: (nextUri) => {
      state.settings.englishVoiceURI = nextUri;
    },
    noVoicesText: "Nincs elérhető angol hang",
  });
  renderVoiceSelectOptions(hungarianVoiceSelect, {
    voices: availableHungarianVoices,
    enabled: state.settings.hungarianTtsEnabled,
    getSelectedVoice: getSelectedHungarianVoice,
    getStoredUri: () => state.settings.hungarianVoiceURI,
    setStoredUri: (nextUri) => {
      state.settings.hungarianVoiceURI = nextUri;
    },
    noVoicesText: "Nincs elérhető magyar hang",
  });
}

function applyTheme() {
  document.body.classList.toggle("dark", Boolean(state.settings.darkMode));
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

function normalizeLoadedBestScores(rawBestScores) {
  const defaults = createDefaultBestScores();
  levels.forEach((level) => {
    const loaded = rawBestScores?.[level.id];
    if (typeof loaded === "number") {
      defaults[level.id][PRACTICE_TYPES.single] = loaded;
    } else if (loaded && typeof loaded === "object") {
      defaults[level.id][PRACTICE_TYPES.single] = Number(
        loaded[PRACTICE_TYPES.single] ?? 0
      );
      defaults[level.id][PRACTICE_TYPES.mixed] = Number(loaded[PRACTICE_TYPES.mixed] ?? 0);
    }
  });
  return defaults;
}

function normalizeLoadedMetrics(rawMetrics) {
  const defaults = createDefaultLevelMetrics();
  levels.forEach((level) => {
    const loaded = rawMetrics?.[level.id];
    if (!loaded || typeof loaded !== "object") return;
    [PRACTICE_TYPES.single, PRACTICE_TYPES.mixed].forEach((type) => {
      if (loaded[type] && typeof loaded[type] === "object") {
        defaults[level.id][type] = {
          ...createDefaultTypeMetrics(),
          ...loaded[type],
        };
      }
    });
  });
  return defaults;
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state.levelBestScores = normalizeLoadedBestScores(parsed.levelBestScores);
      state.levelMetrics = normalizeLoadedMetrics(parsed.levelMetrics);
      state.attempts = Number(parsed.attempts ?? 0);
      state.settings = {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
      };
      state.settings.toastDurationSeconds = clampToastDuration(
        state.settings.toastDurationSeconds
      );
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
    revealTranslation();
    return;
  }
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

toastDurationSecondsInput.addEventListener("input", (event) => {
  const target = event.target;
  const clamped = clampToastDuration(target.value);
  state.settings.toastDurationSeconds = clamped;
  target.value = clamped.toFixed(1);
  toastDurationSecondsValue.textContent = clamped.toFixed(1);
  saveState();
});

englishVoiceSelect?.addEventListener("change", (event) => {
  const target = event.target;
  state.settings.englishVoiceURI = target.value;
  saveState();
});

hungarianVoiceSelect?.addEventListener("change", (event) => {
  const target = event.target;
  state.settings.hungarianVoiceURI = target.value;
  saveState();
});

ttsEnabledToggle?.addEventListener("change", (event) => {
  state.settings.ttsEnabled = Boolean(event.target.checked);
  if (!state.settings.ttsEnabled) {
    stopSpeech();
  }
  renderSettings();
  saveState();
});

hungarianTtsEnabledToggle?.addEventListener("change", (event) => {
  state.settings.hungarianTtsEnabled = Boolean(event.target.checked);
  if (!state.settings.hungarianTtsEnabled) {
    stopSpeech();
  }
  renderSettings();
  saveState();
});

darkModeToggle.addEventListener("change", (event) => {
  state.settings.darkMode = event.target.checked;
  applyTheme();
  saveState();
});

resetProgressBtn.addEventListener("click", () => {
  state.levelBestScores = createDefaultBestScores();
  state.levelMetrics = createDefaultLevelMetrics();
  state.attempts = 0;
  saveState();
  renderLevels();
  renderStats();
});

loadState();
initializeSpeechVoices();
applyTheme();
renderLevels();
renderStats();
renderSettings();
startRound();
renderPracticeCard();
registerServiceWorker();
