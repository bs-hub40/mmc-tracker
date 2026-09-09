(() => {
  const {
    loadState,
    saveState,
    formatTime,
    todayKey,
    round1,
    getDay,
    ensureToday,
    dayEnergy,
    getTargets,
    sanitizeGoals,
    sanitizeProfile,
    sanitizeGoalWeight,
    sanitizeHeightInches,
    sanitizeBodyFat,
    convertWeight,
    calculateMacros,
    ACTIVITY_LEVELS,
    NUTRITION_STRATEGIES,
    getStreak,
    getBestStreak,
    trendSeries,
    avg,
    uid,
    upsertWeight,
    weightStats,
    formatWeightDate,
    getSession,
    loginWithGoogle,
    logout,
    parseMealWithGrok,
    parseActivityWithGrok,
    parseLogWithGrok,
    AI_PROVIDERS,
    getActiveApiKey,
    normalizeProvider,
    migrateAiSettings,
    sanitizeQuickActions,
    clonePayload,
    sanitizeQaMealParsed,
    sanitizeQaActivityParsed,
    THEMES,
    sanitizeTheme,
    THEME_KEY,
    getGoogleClientId,
    googleSignIn,
    googleRestoreToken,
    googleSignOut,
    googleSyncStatus,
    drivePull,
    drivePush,
    scheduleDrivePush,
    flushDrivePush,
    mergeDriveState,
    stateHasUserData,
    stateHasLogs,
    addTombstones,
    hasTombstones,
    applyTombstones,
    mergeTombstones,
    invalidateDriveWrites,
  } = window.MMC;

  const GLOSSARY = [
    {
      id: "calories",
      term: "Calories",
      body: "Energy in food. Your calorie goal is how much to eat on a typical day so the rest of the plan has a target.",
    },
    {
      id: "goal",
      term: "Daily goal",
      body: "The calorie target you set (or the calculator set). The white line on the bar. Hitting this keeps the deficit you planned.",
    },
    {
      id: "tdee",
      term: "Maintenance / TDEE",
      body: "Calories you’d need to hold your current weight, including normal daily movement. It does not include workouts you log in the app. That’s where the deficit ends.",
    },
    {
      id: "deficit",
      term: "Deficit",
      body: "Eating fewer net calories than maintenance. The teal line is the last calorie you can eat today and still be losing. Workouts you log raise that line.",
    },
    {
      id: "surplus",
      term: "Surplus",
      body: "Net calories above maintenance. Weight tends to go up if this keeps happening.",
    },
    {
      id: "food",
      term: "Food",
      body: "Calories from meals you logged today.",
    },
    {
      id: "burned",
      term: "Burned",
      body: "Calories from workouts you logged today. These are extra on top of TDEE, so they let you eat more and stay in the same kind of deficit.",
    },
    {
      id: "net",
      term: "Net",
      body: "Food minus burned. Compared with your daily goal, and with maintenance to see if you’re still in a deficit.",
    },
    {
      id: "budget",
      term: "Budget",
      body: "Daily goal plus today’s logged burn. Eating here is like hitting your goal after accounting for the workout.",
    },
    {
      id: "macros",
      term: "Macros",
      body: "Protein, fat, and carbs. Extra calories from exercise keep the same split as your daily targets. Fiber does not scale.",
    },
    {
      id: "protein",
      term: "Protein",
      body: "Helps keep muscle while you lose or gain. Treat this as a target to hit.",
    },
    {
      id: "fat",
      term: "Fat cap",
      body: "An upper limit, not a goal. Stay at or under this number.",
    },
    {
      id: "carbs",
      term: "Carbs",
      body: "Your main fuel. Treat this as a target to hit.",
    },
    {
      id: "fiber",
      term: "Fiber",
      body: "A minimum, not a cap. Going over is fine. It does not grow when you burn extra calories.",
    },
    {
      id: "bmr",
      term: "BMR",
      body: "Calories your body would use at complete rest. TDEE starts from this, then adds daily movement.",
    },
    {
      id: "activity-level",
      term: "Activity level",
      body: "How much you move on a normal day — walking, work, fidgeting. Used to estimate TDEE. It is not the same as a workout you log.",
    },
    {
      id: "activity-burn",
      term: "Activity burn (calculator)",
      body: "The slice of TDEE above BMR from your activity level. Separate from calories burned in a logged workout.",
    },
    {
      id: "lbm",
      term: "Lean mass",
      body: "Body weight minus estimated fat. The calculator uses it to size protein.",
    },
    {
      id: "body-fat",
      term: "Body fat %",
      body: "Estimate of how much of your weight is fat. The calculator uses it with weight to get lean mass.",
    },
    {
      id: "strategy",
      term: "Nutrition strategy",
      body: "How the calculator splits protein, fat, and carbs. Ketogenic, animal-based, or pro-metabolic — calories still come from your cut, maintain, or bulk math.",
    },
  ];

  const LOG_COPY = {
    nutrition: {
      label: "Log food or activity",
      placeholder:
        'Amounts help — e.g. "Coffee with 1 tbsp half-and-half", "4 oz grass-fed ribeye", or "3 eggs scrambled in 1 tsp butter"',
      jump: "＋ Log food",
    },
    activity: {
      label: "Log a workout",
      placeholder:
        'Minutes help — e.g. "45 min brisk walk", "1.5 mile walk with 40 lb vest", or "Upper body lift, 50 min"',
      jump: "＋ Log activity",
    },
  };

  function glossaryEntry(id) {
    return GLOSSARY.find((item) => item.id === id) || null;
  }

  function infoI(id) {
    const entry = glossaryEntry(id);
    if (!entry) return "";
    return `<button type="button" class="info-i" data-glossary="${id}" aria-label="What is ${entry.term}?" title="${entry.term}">i</button>`;
  }

  function closeGlossaryTip() {
    if (!els.glossaryTip) return;
    els.glossaryTip.hidden = true;
    els.glossaryTip.removeAttribute("data-glossary-id");
  }

  function positionGlossaryTip(btn) {
    const tip = els.glossaryTip;
    if (!tip || !btn) return;
    const pad = 10;
    const r = btn.getBoundingClientRect();
    const tipW = Math.min(280, window.innerWidth - pad * 2);
    tip.style.width = `${tipW}px`;
    let left = r.left + r.width / 2 - tipW / 2;
    left = Math.min(window.innerWidth - tipW - pad, Math.max(pad, left));
    tip.style.left = `${left}px`;
    tip.style.right = "auto";
    const tipH = tip.offsetHeight || 120;
    const below = r.bottom + 8 + tipH + pad < window.innerHeight;
    tip.style.top = below ? `${r.bottom + 8}px` : `${Math.max(pad, r.top - tipH - 8)}px`;
  }

  function openGlossaryTip(btn) {
    const entry = glossaryEntry(btn.getAttribute("data-glossary"));
    if (!entry || !els.glossaryTip) return;
    if (els.glossaryTipTerm) els.glossaryTipTerm.textContent = entry.term;
    if (els.glossaryTipBody) els.glossaryTipBody.textContent = entry.body;
    els.glossaryTip.hidden = false;
    els.glossaryTip.setAttribute("data-glossary-id", entry.id);
    positionGlossaryTip(btn);
  }

  function goToGlossary(id) {
    closeGlossaryTip();
    setMode("settings");
    setSettingsSection("glossary");
    requestAnimationFrame(() => {
      const el = document.getElementById(`glossary-${id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("is-focus");
      window.setTimeout(() => el.classList.remove("is-focus"), 1800);
    });
  }

  function renderGlossary() {
    if (!els.glossaryList) return;
    els.glossaryList.innerHTML = GLOSSARY.map(
      (item) => `
        <div class="glossary-item" id="glossary-${item.id}">
          <dt>${item.term}</dt>
          <dd>${item.body}</dd>
        </div>
      `
    ).join("");
  }

  function logButtonLabel() {
    return "Log It";
  }

  const LOG_WAIT = [
    "Sending this to your AI…",
    "Figuring out food vs movement…",
    "Unpacking the day…",
    "Jotting it in your log…",
  ];

  let logWaitTimer = null;
  let logWaitIndex = 0;

  function stopLogWaitCopy() {
    if (logWaitTimer) {
      clearInterval(logWaitTimer);
      logWaitTimer = null;
    }
    logWaitIndex = 0;
  }

  function paintLogWaitCopy() {
    const line = LOG_WAIT[logWaitIndex % LOG_WAIT.length];
    const text = els.logBtn?.querySelector(".btn-text");
    if (text) text.textContent = line;
  }

  function startLogWaitCopy() {
    stopLogWaitCopy();
    paintLogWaitCopy();
    logWaitTimer = setInterval(() => {
      logWaitIndex += 1;
      paintLogWaitCopy();
    }, 3200);
  }

  let state = null;
  let session = null;
  let currentMode = "nutrition";
  let currentView = "today";
  let appReady = false;
  let qaEditType = "nutrition";
  let settingsSection = "goals";
  let qaBusyIndex = -1;
  let driveSyncing = false;
  let lastDrivePullAt = 0;
  let lastLocalEditAt = 0;

  const els = {
    authScreen: document.getElementById("auth-screen"),
    appShell: document.getElementById("app-shell"),
    authError: document.getElementById("auth-error"),
    googleSignInBtn: document.getElementById("google-signin-btn"),
    googleAuthHelp: document.getElementById("google-auth-help"),
    macros: document.getElementById("macros"),
    energyCard: document.getElementById("energy-card"),
    dailyTracker: document.getElementById("daily-tracker"),
    logLabel: document.getElementById("log-label"),
    logInput: document.getElementById("log-input"),
    logBtn: document.getElementById("log-btn"),
    micBtn: document.getElementById("mic-btn"),
    logHint: document.getElementById("log-hint"),
    mealList: document.getElementById("meal-list"),
    emptyState: document.getElementById("empty-state"),
    resetDayBtn: document.getElementById("reset-day-btn"),
    logoutBtn: document.getElementById("logout-btn"),
    settingsBtn: document.getElementById("settings-btn"),
    userTagline: document.getElementById("user-tagline"),
    streakCount: document.getElementById("streak-count"),
    streakSub: document.getElementById("streak-sub"),
    streakBest: document.getElementById("streak-best"),
    activityList: document.getElementById("activity-list"),
    activityEmpty: document.getElementById("activity-empty"),
    weekChart: document.getElementById("week-chart"),
    weekStats: document.getElementById("week-stats"),
    weekHitRate: document.getElementById("week-hit-rate"),
    monthChart: document.getElementById("month-chart"),
    monthStats: document.getElementById("month-stats"),
    monthHitRate: document.getElementById("month-hit-rate"),
    goalLegendMonth: document.getElementById("goal-legend-month"),
    modeNutrition: document.getElementById("mode-nutrition"),
    modeActivity: document.getElementById("mode-activity"),
    modeWeight: document.getElementById("mode-weight"),
    modeSettings: document.getElementById("mode-settings"),
    logPanel: document.getElementById("log-panel"),
    logCompose: document.getElementById("log-compose"),
    logJumpBtn: document.getElementById("log-jump-btn"),
    quickActions: document.getElementById("quick-actions"),
    toast: document.getElementById("toast"),
    weightInput: document.getElementById("weight-input"),
    weightUnit: document.getElementById("weight-unit"),
    weightBtn: document.getElementById("weight-btn"),
    weightHint: document.getElementById("weight-hint"),
    weightDateLabel: document.getElementById("weight-date-label"),
    goalWeightInput: document.getElementById("goal-weight-input"),
    goalWeightUnit: document.getElementById("goal-weight-unit"),
    goalWeightBtn: document.getElementById("goal-weight-btn"),
    goalWeightHint: document.getElementById("goal-weight-hint"),
    goalWeightStatus: document.getElementById("goal-weight-status"),
    profileAge: document.getElementById("profile-age"),
    profileSexPicks: document.getElementById("profile-sex-picks"),
    saveProfileBtn: document.getElementById("save-profile-btn"),
    profileHint: document.getElementById("profile-hint"),
    weightChart: document.getElementById("weight-chart"),
    weightStatsEl: document.getElementById("weight-stats"),
    weightDelta: document.getElementById("weight-delta"),
    weightList: document.getElementById("weight-list"),
    weightEmpty: document.getElementById("weight-empty"),
    viewToday: document.getElementById("view-today"),
    viewWeek: document.getElementById("view-week"),
    viewMonth: document.getElementById("view-month"),
    goalCalories: document.getElementById("goal-calories"),
    goalProtein: document.getElementById("goal-protein"),
    goalFat: document.getElementById("goal-fat"),
    goalCarbs: document.getElementById("goal-carbs"),
    goalFiber: document.getElementById("goal-fiber"),
    goalMaintenance: document.getElementById("goal-maintenance"),
    saveGoalsBtn: document.getElementById("save-goals-btn"),
    goalsHint: document.getElementById("goals-hint"),
    macroWeight: document.getElementById("macro-weight"),
    macroWeightUnit: document.getElementById("macro-weight-unit"),
    macroGoal: document.getElementById("macro-goal"),
    macroGoalUnit: document.getElementById("macro-goal-unit"),
    macroHeight: document.getElementById("macro-height"),
    macroHeightUnit: document.getElementById("macro-height-unit"),
    macroBf: document.getElementById("macro-bf"),
    macroAge: document.getElementById("macro-age"),
    macroSexPicks: document.getElementById("macro-sex-picks"),
    macroActivityPicks: document.getElementById("macro-activity-picks"),
    macroStrategyPicks: document.getElementById("macro-strategy-picks"),
    macroHint: document.getElementById("macro-hint"),
    macroResults: document.getElementById("macro-results"),
    macroApplyBtn: document.getElementById("macro-apply-btn"),
    themeSwatches: document.getElementById("theme-swatches"),
    themeHint: document.getElementById("theme-hint"),
    qaEditor: document.getElementById("qa-editor"),
    saveQaBtn: document.getElementById("save-qa-btn"),
    qaHint: document.getElementById("qa-hint"),
    settingsUsername: document.getElementById("settings-username"),
    accountHelp: document.getElementById("account-help"),
    driveSyncBox: document.getElementById("drive-sync-box"),
    driveSyncStatus: document.getElementById("drive-sync-status"),
    driveLinks: document.getElementById("drive-links"),
    driveSyncBtn: document.getElementById("drive-sync-btn"),
    driveSyncHint: document.getElementById("drive-sync-hint"),
    settingsLogoutBtn: document.getElementById("settings-logout-btn"),
    editModal: document.getElementById("edit-modal"),
    editTitle: document.getElementById("edit-title"),
    editBody: document.getElementById("edit-body"),
    editClose: document.getElementById("edit-close"),
    editReparse: document.getElementById("edit-reparse"),
    editSave: document.getElementById("edit-save"),
    editHint: document.getElementById("edit-hint"),
    qaSlotModal: document.getElementById("qa-slot-modal"),
    qaSlotChoices: document.getElementById("qa-slot-choices"),
    qaSlotCancel: document.getElementById("qa-slot-cancel"),
    qaSlotLead: document.getElementById("qa-slot-lead"),
    qaSlotName: document.getElementById("qa-slot-name"),
    qaSlotSave: document.getElementById("qa-slot-save"),
    qaSlotHint: document.getElementById("qa-slot-hint"),
    profileOnboard: document.getElementById("profile-onboard"),
    qaStepKicker: document.getElementById("qa-step-kicker"),
    qaStepTitle: document.getElementById("qa-step-title"),
    qaStepHelp: document.getElementById("qa-step-help"),
    qaStepBody: document.getElementById("qa-step-body"),
    qaStepHint: document.getElementById("qa-step-hint"),
    qaSkipBtn: document.getElementById("qa-skip-btn"),
    qaNextBtn: document.getElementById("qa-next-btn"),
    appTour: document.getElementById("app-tour"),
    tourSpot: document.getElementById("tour-spot"),
    tourCard: document.getElementById("tour-card"),
    tourKicker: document.getElementById("tour-kicker"),
    tourTitle: document.getElementById("tour-title"),
    tourBody: document.getElementById("tour-body"),
    tourSkipBtn: document.getElementById("tour-skip-btn"),
    tourNextBtn: document.getElementById("tour-next-btn"),
    glossaryList: document.getElementById("glossary-list"),
    glossaryTip: document.getElementById("glossary-tip"),
    glossaryTipTerm: document.getElementById("glossary-tip-term"),
    glossaryTipBody: document.getElementById("glossary-tip-body"),
  };

  let editTarget = null;
  let pendingQaSave = null;
  let toastTimer = null;
  let logBusy = false;
  let setupQueue = [];
  let setupIndex = 0;
  let qaSexPick = "";
  let lastMacroResult = null;
  let energyDetailsOpen = false;
  let lastLoggedIds = { meals: [], activities: [] };
  let tourIndex = 0;
  const TOUR_STEPS = [
    {
      id: "welcome",
      title: "Welcome to Log it",
      body: "Type what you ate or did. We estimate calories and macros, then save the log to your Google Drive.",
    },
    {
      id: "log",
      title: "Just type it — with amounts",
      body: "Vague logs guess wrong. Put the details in: “coffee with 1 tbsp half-and-half,” “4 oz grass-fed ribeye,” “3 eggs scrambled in 1 tsp butter.” Walks need minutes too.",
      target: "#log-compose",
    },
    {
      id: "tabs",
      title: "Food, movement, scale",
      body: "Nutrition is meals and remaining calories. Activity is workouts. Weight is the trendline — no calorie tracker there.",
      target: ".mode-tabs",
    },
    {
      id: "energy",
      title: "Today at a glance",
      body: "Log first, then glance at calories left and the bar. Open Goal, TDEE & breakdown if you want the tiles and jargon.",
      target: "#daily-tracker",
    },
    {
      id: "settings",
      title: "Make it yours",
      body: "The gear has your macro calculator, instant shortcuts, and Drive backup. That’s the whole app.",
      target: "#settings-btn",
    },
  ];

  function targets() {
    return getTargets(state);
  }

  function macroMeta() {
    const t = targets();
    return [
      { key: "protein", label: "Protein", unit: "g", target: t.protein, mode: "target" },
      { key: "fat", label: "Fat Cap", unit: "g", target: t.fat, mode: "ceiling" },
      { key: "carbs", label: "Carbs", unit: "g", target: t.carbs, mode: "target" },
      { key: "fiber", label: "Fiber", unit: "g", target: t.fiber, mode: "minimum" },
    ];
  }

  function today() {
    return getDay(state, todayKey());
  }

  function persist() {
    state = applyTombstones(ensureToday(state));
    state.updatedAt = Date.now();
    lastLocalEditAt = Date.now();
    saveState(state);
    if (session?.provider === "google") {
      scheduleDrivePush(state, { skipPull: true });
      flushDrivePush();
      renderDriveStatus();
    }
  }

  function paintThemePicker(theme) {
    const cfg = THEMES[theme] || THEMES.ember;
    document.querySelectorAll("[data-theme-id]").forEach((btn) => {
      const on = btn.getAttribute("data-theme-id") === theme;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
    if (els.themeHint) els.themeHint.textContent = cfg.hint;
  }

  function applyTheme(id, save = false) {
    const theme = sanitizeTheme(id);
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore quota */
    }
    paintThemePicker(theme);
    if (save && state && state.theme !== theme) {
      state.theme = theme;
      persist();
    }
  }

  function buildPersonContext() {
    if (!state) return "";
    const lines = [
      "Person context for THIS request only (do not recall a different profile):",
    ];
    const stats = weightStats(state);
    const latest = stats.latest;
    if (latest) {
      lines.push(
        `Current weight: ${round1(latest.weight)} ${latest.unit} (latest logged scale reading).`
      );
    }
    const goal = sanitizeGoalWeight(state.goalWeight);
    if (goal) {
      lines.push(`Goal weight: ${round1(goal.weight)} ${goal.unit}.`);
    }
    const profile = sanitizeProfile(state.profile);
    if (profile.age) lines.push(`Age: ${profile.age}.`);
    if (profile.sex === "M") lines.push("Sex: male.");
    if (profile.sex === "F") lines.push("Sex: female.");
    if (profile.heightIn) {
      const unit = profile.heightUnit === "cm" ? "cm" : "in";
      const shown =
        unit === "cm"
          ? round1(profile.heightIn * 2.54)
          : profile.heightIn;
      lines.push(`Height: ${shown} ${unit}.`);
    }
    if (profile.bodyFat != null) lines.push(`Body fat: ${profile.bodyFat}%.`);
    if (profile.activityPal) {
      const level = ACTIVITY_LEVELS.find((a) => a.pal === profile.activityPal);
      lines.push(`Activity level: ${level?.name || profile.activityPal} (PAL ${profile.activityPal}).`);
    }
    if (profile.strategy) {
      const strat = NUTRITION_STRATEGIES.find((s) => s.id === profile.strategy);
      lines.push(`Nutrition strategy: ${strat?.name || profile.strategy}.`);
    }
    if (lines.length === 1) return "";
    return lines.join("\n");
  }

  function setHint(el, message, ok = false) {
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.classList.toggle("ok", ok);
  }

  function positionToast() {
    if (!els.toast || els.toast.hidden) return;
    const nearLog =
      els.logPanel &&
      !els.logPanel.hidden &&
      els.logBtn &&
      (currentMode === "nutrition" || currentMode === "activity");
    els.toast.classList.toggle("near-cta", Boolean(nearLog));
    if (!nearLog) {
      els.toast.style.top = "";
      return;
    }
    const r = els.logBtn.getBoundingClientRect();
    const gap = 10;
    const estimatedH = els.toast.offsetHeight || 48;
    const below = r.bottom + gap + estimatedH + 12 < window.innerHeight;
    els.toast.style.top = below
      ? `${r.bottom + gap}px`
      : `${Math.max(12, r.top - estimatedH - gap)}px`;
  }

  function showToast(message, ok = true) {
    if (!els.toast || !message) return;
    els.toast.hidden = false;
    els.toast.textContent = message;
    els.toast.classList.toggle("ok", ok);
    els.toast.classList.toggle("err", !ok);
    positionToast();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
      els.toast.style.top = "";
      els.toast.classList.remove("near-cta");
    }, 3200);
  }

  function hasHostedAi() {
    return Boolean(String(window.MMC.AI_PROXY_URL || "").trim());
  }

  function hasAiAccess() {
    return hasHostedAi();
  }

  function syncAiGate() {
    const ready = hasAiAccess();
    if (els.logCompose) els.logCompose.hidden = !ready;
    if (currentMode === "nutrition" || currentMode === "activity") {
      els.logBtn.disabled = logBusy || !ready;
      els.logInput.disabled = logBusy || !ready;
      if (els.micBtn) els.micBtn.disabled = logBusy || !ready;
    }
    renderQuickActions();
  }

  let speechRec = null;
  let speechListening = false;

  function speechEngine() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function setMicListening(on) {
    speechListening = on;
    if (!els.micBtn) return;
    els.micBtn.classList.toggle("listening", on);
    els.micBtn.setAttribute("aria-pressed", on ? "true" : "false");
    els.micBtn.setAttribute("aria-label", on ? "Stop listening" : "Speak to fill");
    els.micBtn.title = on ? "Stop listening" : "Speak";
  }

  function stopSpeech() {
    if (speechRec) {
      try {
        speechRec.onend = null;
        speechRec.onerror = null;
        speechRec.onresult = null;
        speechRec.stop();
      } catch {
        /* already stopped */
      }
      speechRec = null;
    }
    setMicListening(false);
  }

  function toggleSpeech() {
    const Ctor = speechEngine();
    if (!Ctor) {
      showToast("Speech to text isn’t available in this browser. Try Chrome or Safari.", false);
      return;
    }
    if (speechListening) {
      stopSpeech();
      return;
    }
    if (els.logInput?.disabled) return;
    try {
      const rec = new Ctor();
      rec.lang = navigator.language || "en-US";
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;
      const base = (els.logInput.value || "").trim();
      let finals = "";
      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) finals = `${finals} ${piece}`.trim();
          else interim += piece;
        }
        const parts = [base, finals, interim.trim()].filter(Boolean);
        els.logInput.value = parts.join(" ");
      };
      rec.onerror = (event) => {
        const err = event?.error;
        if (err === "aborted" || err === "no-speech") return;
        stopSpeech();
        if (err === "not-allowed" || err === "service-not-allowed") {
          showToast("Microphone permission is blocked for this site.", false);
        } else {
          showToast("Could not use the microphone.", false);
        }
      };
      rec.onend = () => {
        if (speechListening && speechRec === rec) {
          try {
            rec.start();
            return;
          } catch {
            /* gesture required; fall through */
          }
        }
        if (speechRec === rec) speechRec = null;
        setMicListening(false);
      };
      speechRec = rec;
      rec.start();
      setMicListening(true);
    } catch {
      stopSpeech();
      showToast("Could not start the microphone.", false);
    }
  }

  function setBusy(busy) {
    if (currentMode === "weight" || currentMode === "settings") return;
    logBusy = busy;
    const ready = hasAiAccess();
    els.logBtn.disabled = busy || !ready;
    els.logInput.disabled = busy || !ready;
    if (els.micBtn) els.micBtn.disabled = busy || !ready;
    if (busy) stopSpeech();
    const spinner = els.logBtn.querySelector(".btn-spinner");
    const text = els.logBtn.querySelector(".btn-text");
    spinner.hidden = !busy;
    if (busy) {
      startLogWaitCopy();
    } else {
      stopLogWaitCopy();
      if (text) text.textContent = logButtonLabel();
    }
    if (els.quickActions) renderQuickActions();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function showAuth() {
    els.authScreen.hidden = false;
    els.appShell.hidden = true;
    syncGoogleAuthUi();
  }

  function enterApp(nextSession) {
    session = nextSession;
    state = ensureToday(loadState());
    Object.assign(state, migrateAiSettings(state));
    applyTheme(state.theme);
    saveState(state);
    els.authScreen.hidden = true;
    els.appShell.hidden = false;
    els.userTagline.textContent = `@${session.username}`;
    if (!appReady) {
      wireAppEvents();
      appReady = true;
    }
    setMode("nutrition");
    setView("today");
    renderAll();
    if (session?.provider !== "google") maybeStartProfileSetup();
  }

  function handleSignOut() {
    closeTour(false);
    closeProfileSetup();
    googleSignOut();
    logout();
    session = null;
    state = null;
    showAuth();
  }

  function syncGoogleAuthUi() {
    const clientId = getGoogleClientId();
    if (els.googleSignInBtn) els.googleSignInBtn.disabled = !clientId;
    if (els.googleAuthHelp) {
      els.googleAuthHelp.textContent = clientId
        ? "Google will ask to save a Log it folder on your Drive. Tap Allow so your log follows you to other devices."
        : "Google sign-in is not configured for this app build.";
    }
  }

  function logCopyForMode() {
    return LOG_COPY[currentMode] || LOG_COPY.nutrition;
  }

  function syncLogPanel() {
    if (currentMode === "weight" || currentMode === "settings") return;
    const copy = logCopyForMode();
    els.logLabel.textContent = copy.label;
    els.logInput.placeholder = copy.placeholder;
    if (els.logJumpBtn) els.logJumpBtn.textContent = copy.jump;
    if (!logBusy) {
      const text = els.logBtn.querySelector(".btn-text");
      if (text) text.textContent = logButtonLabel();
    }
    syncAiGate();
  }

  function updateLogJump() {
    if (!els.logJumpBtn) return;
    const showFullLog =
      (currentMode === "nutrition" || currentMode === "activity") &&
      els.logPanel &&
      !els.logPanel.hidden;
    if (!showFullLog) {
      els.logJumpBtn.hidden = true;
      return;
    }
    const rect = els.logPanel.getBoundingClientRect();
    els.logJumpBtn.hidden = rect.bottom > 88;
  }

  function updateLogVisibility() {
    const showFullLog = currentMode === "nutrition" || currentMode === "activity";
    els.logPanel.hidden = !showFullLog;
    updateLogJump();
  }

  function setMode(mode) {
    if (
      currentMode === "settings" &&
      settingsSection === "quick" &&
      state &&
      els.qaEditor
    ) {
      state.quickActions = readQaEditorDraft();
      persist();
    }
    currentMode = mode;
    if (mode !== "nutrition" && mode !== "activity") stopSpeech();
    document.querySelectorAll(".mode-tabs .mode-tab").forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (els.settingsBtn) {
      const settingsOn = mode === "settings";
      els.settingsBtn.classList.toggle("active", settingsOn);
      els.settingsBtn.setAttribute("aria-pressed", settingsOn ? "true" : "false");
    }

    els.modeNutrition.hidden = mode !== "nutrition";
    els.modeActivity.hidden = mode !== "activity";
    els.modeWeight.hidden = mode !== "weight";
    els.modeSettings.hidden = mode !== "settings";

    // Streak + calorie balance stay on Nutrition and Activity only
    els.dailyTracker.hidden = mode === "settings" || mode === "weight";
    updateLogVisibility();

    syncLogPanel();
    setHint(els.logHint, "");
    setHint(els.weightHint, "");
    renderQuickActions();

    if (mode === "weight") {
      els.weightDateLabel.textContent = formatWeightDate(todayKey());
      els.weightUnit.value = state.weightUnit || "lb";
      renderWeight();
    }
    if (mode === "settings") {
      fillSettingsForm();
      setSettingsSection(settingsSection);
    }
    if (mode === "nutrition" && currentView !== "today") renderTrends();
  }

  function setSettingsSection(section) {
    const allowed = new Set(["goals", "quick", "account", "glossary"]);
    settingsSection = allowed.has(section) ? section : "goals";
    document.querySelectorAll("[data-settings-section]").forEach((tab) => {
      const active = tab.dataset.settingsSection === settingsSection;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.settingsPanel !== settingsSection;
    });
    if (settingsSection === "quick") renderQaEditor();
  }

  function setView(view) {
    currentView = view;
    document.querySelectorAll(".view-tabs .tab").forEach((tab) => {
      const active = tab.dataset.view === view;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    els.viewToday.hidden = view !== "today";
    els.viewWeek.hidden = view !== "week";
    els.viewMonth.hidden = view !== "month";
    updateLogVisibility();
    renderQuickActions();
    if (view !== "today") renderTrends();
  }

  function fillSettingsForm() {
    const t = targets();
    els.goalCalories.value = t.calories;
    els.goalProtein.value = t.protein;
    els.goalFat.value = t.fat;
    els.goalCarbs.value = t.carbs;
    els.goalFiber.value = t.fiber;
    if (els.goalMaintenance) {
      els.goalMaintenance.value = t.maintenance || "";
    }
    Object.assign(state, migrateAiSettings(state));
    state.quickActions = sanitizeQuickActions(state.quickActions);
    els.settingsUsername.textContent = session?.username || "—";
    if (els.accountHelp) {
      els.accountHelp.textContent =
        "Signed in with Google. Your log syncs to a Log it folder in this Google Drive.";
    }
    setHint(els.goalsHint, "");
    setHint(els.qaHint, "");
    setHint(els.driveSyncHint, "");
    renderQaEditor();
    renderDriveStatus();
    paintThemePicker(sanitizeTheme(state.theme));
    paintProfileForm();
    paintMacroForm();
    renderGlossary();
  }

  function renderDriveStatus() {
    if (!els.driveSyncBox) return;
    const googleUser = session?.provider === "google";
    els.driveSyncBox.hidden = !googleUser;
    if (!googleUser) return;
    const status = googleSyncStatus();
    if (els.driveLinks) {
      if (status.folderUrl || status.fileUrl) {
        els.driveLinks.hidden = false;
        const bits = [];
        if (status.folderUrl) {
          bits.push(
            `<a href="${status.folderUrl}" target="_blank" rel="noopener noreferrer">Open Log it folder</a>`
          );
        }
        if (status.fileUrl) {
          bits.push(
            `<a href="${status.fileUrl}" target="_blank" rel="noopener noreferrer">Open backup file</a>`
          );
        }
        els.driveLinks.innerHTML = bits.join(" · ");
      } else {
        els.driveLinks.hidden = true;
        els.driveLinks.innerHTML = "";
      }
    }
    if (status.lastSyncError) {
      els.driveSyncStatus.textContent = `Drive: ${status.lastSyncError}`;
      return;
    }
    if (!status.connected) {
      els.driveSyncStatus.textContent =
        "Drive: tap Sync now if this device needs to reconnect";
      return;
    }
    els.driveSyncStatus.textContent = status.lastSyncAt
      ? `Drive: synced ${new Date(status.lastSyncAt).toLocaleTimeString()}`
      : "Drive: connected";
  }

  async function syncFromDrive(opts = {}) {
    if (session?.provider !== "google") return;
    if (driveSyncing) return;
    const quiet = Boolean(opts.quiet);
    if (quiet && lastLocalEditAt && Date.now() - lastLocalEditAt < 15000) return;
    const interactive = Boolean(opts.interactive);
    driveSyncing = true;
    try {
      const restored = await googleRestoreToken(interactive);
      if (!restored) {
        renderDriveStatus();
        return;
      }
      const remote = await drivePull();
      lastDrivePullAt = Date.now();
      if (!remote) {
        if (stateHasUserData(state)) {
          await drivePush(state, { skipPull: true });
        }
        renderDriveStatus();
        return;
      }

      remote.tombstones = mergeTombstones(state?.tombstones, remote.tombstones);
      const takeRemote = !stateHasUserData(state) && !hasTombstones(state);
      state = applyTombstones(takeRemote ? remote : mergeDriveState(state, remote));
      saveState(state);
      renderAll();
      await drivePush(state, { skipPull: true });
      renderDriveStatus();
    } catch (err) {
      if (!quiet) setHint(els.driveSyncHint, err.message || "Drive sync failed.");
      renderDriveStatus();
      if (!stateHasUserData(state)) {
        showToast(err.message || "Couldn't load your log from Drive. Try Sync now in Settings.", false);
      }
    } finally {
      driveSyncing = false;
      maybeStartProfileSetup();
    }
  }

  async function handleGoogleSignIn() {
    setHint(els.authError, "");
    if (!getGoogleClientId()) {
      setHint(els.authError, "Google sign-in is not configured for this app.");
      return;
    }
    if (els.googleSignInBtn) els.googleSignInBtn.disabled = true;
    try {
      const profile = await googleSignIn({ forceConsent: true });
      const next = loginWithGoogle(profile);
      enterApp(next);
      await syncFromDrive();
    } catch (err) {
      setHint(els.authError, err.message || "Google sign-in failed.");
    } finally {
      syncGoogleAuthUi();
    }
  }

  async function handleDriveSyncNow() {
    if (session?.provider !== "google") return;
    setHint(els.driveSyncHint, "");
    els.driveSyncBtn.disabled = true;
    try {
      await syncFromDrive({ interactive: true });
      setHint(els.driveSyncHint, "Pulled latest from Google Drive.", true);
    } catch (err) {
      setHint(els.driveSyncHint, err.message || "Drive sync failed.");
    } finally {
      els.driveSyncBtn.disabled = false;
    }
  }

  function qaPreviewText(slot) {
    if (!slot?.parsed) {
      return "Not created yet. Describe it, then tap Create with AI.";
    }
    if (qaEditType === "activity") {
      const kcal = round1(slot.parsed.totalCaloriesBurned);
      return `Ready · ${kcal} kcal burned · tap under the log box to log instantly`;
    }
    const kcal = round1(slot.parsed.totalCalories);
    return `Ready · ${kcal} kcal · tap under the log box to log instantly`;
  }

  function renderQaEditor() {
    if (!els.qaEditor) return;
    document.querySelectorAll("[data-qa-type]").forEach((tab) => {
      const active = tab.dataset.qaType === qaEditType;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    const slots = sanitizeQuickActions(state.quickActions)[qaEditType];
    const kind = qaEditType === "nutrition" ? "food" : "exercise";
    els.qaEditor.innerHTML = slots
      .map((slot, i) => {
        const ready = Boolean(slot.parsed);
        const busy = qaBusyIndex === i;
        const createLabel = busy
          ? "Parsing…"
          : ready
            ? "Update with AI"
            : "Create with AI";
        return `
      <div class="qa-slot" data-qa-index="${i}">
        <p class="qa-slot-label">Quick action ${i + 1}</p>
        <label class="field-label" for="qa-label-${i}">Button label</label>
        <input
          id="qa-label-${i}"
          class="field-input"
          type="text"
          maxlength="40"
          placeholder="${qaEditType === "nutrition" ? "e.g. Breakfast" : "e.g. Walk"}"
          value="${escapeHtml(slot.label)}"
          data-qa-field="label"
          ${busy ? "disabled" : ""}
        />
        <label class="field-label" for="qa-prompt-${i}">What to log</label>
        <textarea
          id="qa-prompt-${i}"
          class="field-input"
          maxlength="500"
          rows="3"
          placeholder="${
            qaEditType === "nutrition"
              ? "e.g. 3 eggs scrambled in butter, 1 cup orange juice"
              : "e.g. 45 min brisk walk"
          }"
          data-qa-field="prompt"
          ${busy ? "disabled" : ""}
        >${escapeHtml(slot.prompt)}</textarea>
        <p class="qa-preview${ready ? " ready" : ""}">${escapeHtml(qaPreviewText(slot))}</p>
        <div class="qa-slot-actions">
          <button type="button" class="btn btn-primary" data-qa-create="${i}" ${busy ? "disabled" : ""}>
            ${createLabel}
          </button>
          <button type="button" class="btn btn-ghost" data-qa-clear="${i}" ${
            busy || (!slot.prompt && !slot.label && !slot.parsed) ? "hidden" : ""
          }>Remove</button>
        </div>
      </div>
    `;
      })
      .join("");
  }

  function readQaEditorDraft() {
    if (!els.qaEditor) return sanitizeQuickActions(state.quickActions);
    const next = sanitizeQuickActions(state.quickActions);
    next[qaEditType] = [0, 1, 2].map((i) => {
      const root = els.qaEditor.querySelector(`[data-qa-index="${i}"]`);
      const existing = next[qaEditType][i] || {};
      const label = (root?.querySelector('[data-qa-field="label"]')?.value || "").trim();
      const prompt = (root?.querySelector('[data-qa-field="prompt"]')?.value || "").trim();
      const promptChanged = prompt !== (existing.prompt || "");
      return {
        id: existing.id || uid(),
        label,
        prompt,
        parsed: promptChanged ? null : existing.parsed || null,
      };
    });
    return sanitizeQuickActions(next);
  }

  async function createQuickAction(index) {
    if (!hasAiAccess()) {
      setHint(els.qaHint, "AI logging is not available yet.");
      showToast("AI is not available right now", false);
      return;
    }
    state.quickActions = readQaEditorDraft();
    const slot = state.quickActions[qaEditType][index];
    const prompt = (slot?.prompt || "").trim();
    if (!prompt) {
      setHint(els.qaHint, "Describe the food or exercise first.");
      return;
    }

    qaBusyIndex = index;
    setHint(els.qaHint, "");
    renderQaEditor();

    try {
      const parsed =
        qaEditType === "activity"
          ? await parseActivityWithGrok({
              provider: state.provider,
              apiKey: getActiveApiKey(state),
              model: state.model,
              text: prompt,
              context: buildPersonContext(),
            })
          : await parseMealWithGrok({
              provider: state.provider,
              apiKey: getActiveApiKey(state),
              model: state.model,
              text: prompt,
              context: buildPersonContext(),
            });
      const label =
        slot.label ||
        parsed.items?.[0]?.name ||
        (qaEditType === "activity" ? "Exercise" : "Meal");
      state.quickActions[qaEditType][index] = {
        id: slot.id || uid(),
        label: String(label).slice(0, 40),
        prompt,
        parsed,
      };
      state.quickActions = sanitizeQuickActions(state.quickActions);
      persist();
      renderQuickActions();
      const kcal =
        qaEditType === "activity"
          ? round1(parsed.totalCaloriesBurned)
          : round1(parsed.totalCalories);
      setHint(
        els.qaHint,
        `Saved. ${label} is ready (${kcal} kcal). It will log instantly from the box at the top.`,
        true
      );
      showToast(`${label} ready — logs instantly`, true);
    } catch (err) {
      const providerLabel = AI_PROVIDERS[normalizeProvider(state.provider)]?.label || "AI";
      setHint(els.qaHint, err.message || `Could not parse with ${providerLabel}.`);
      showToast("Could not create quick action", false);
    } finally {
      qaBusyIndex = -1;
      renderQaEditor();
    }
  }

  function clearQuickAction(index) {
    state.quickActions = readQaEditorDraft();
    state.quickActions[qaEditType][index] = {
      id: uid(),
      label: "",
      prompt: "",
      parsed: null,
    };
    state.quickActions = sanitizeQuickActions(state.quickActions);
    persist();
    renderQaEditor();
    renderQuickActions();
    setHint(els.qaHint, "Quick action removed.", true);
  }

  function activeQuickActions() {
    const qa = sanitizeQuickActions(state?.quickActions);
    const ready = (item) => item.label && (item.parsed || item.prompt);
    if (currentMode === "activity") {
      return qa.activity.filter(ready);
    }
    return [...qa.nutrition, ...qa.activity].filter(ready);
  }

  function renderQuickActions() {
    if (!els.quickActions) return;
    const show =
      (currentMode === "nutrition" || currentMode === "activity") &&
      !els.logPanel.hidden;
    const actions = show ? activeQuickActions() : [];
    if (!actions.length) {
      els.quickActions.hidden = true;
      els.quickActions.innerHTML = "";
      return;
    }

    els.quickActions.hidden = false;
    els.quickActions.innerHTML = actions
      .map((action) => {
        const instant = Boolean(action.parsed);
        const blocked = logBusy || (!instant && !hasAiAccess());
        return `
      <button
        type="button"
        class="quick-action-btn"
        data-qa-id="${escapeHtml(action.id)}"
        ${blocked ? "disabled" : ""}
        title="${escapeHtml(
          instant
            ? "Logs instantly — AI already ran in Settings"
            : action.prompt
        )}"
      >${escapeHtml(action.label)}</button>
    `;
      })
      .join("");
  }

  function isActivityPayload(parsed) {
    if (!parsed || typeof parsed !== "object") return false;
    if (parsed.totalCaloriesBurned != null) return true;
    const first = parsed.items?.[0];
    return Boolean(first && first.caloriesBurned != null && first.protein == null);
  }

  function commitMealLog(parsed, rawText) {
    const { source, ...meal } = parsed;
    const id = uid();
    today().meals.push({
      id,
      loggedAt: Date.now(),
      rawText: source || rawText,
      ...meal,
    });
    lastLoggedIds.meals.push(id);
    return id;
  }

  function commitActivityLog(parsed, rawText) {
    const { source, ...activity } = parsed;
    const id = uid();
    today().activities.push({
      id,
      loggedAt: Date.now(),
      rawText: source || rawText,
      text: source || rawText,
      ...activity,
    });
    lastLoggedIds.activities.push(id);
    return id;
  }

  function focusNewEntry(kind) {
    const list = kind === "activity" ? els.activityList : els.mealList;
    const card = list?.querySelector(".is-new");
    if (!card) return;
    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("is-highlight");
      window.setTimeout(() => card.classList.remove("is-highlight"), 2200);
      positionToast();
    });
  }

  function revealLoggedKind(kind) {
    if (kind === "activity") {
      if (currentMode !== "activity") setMode("activity");
      return;
    }
    if (currentView !== "today") setView("today");
    if (currentMode !== "nutrition") setMode("nutrition");
  }

  function logMessage(result) {
    const bits = [];
    const meals = result.meals || [];
    const acts = result.activities || [];
    if (meals.length === 1) {
      const n = meals[0].items.length;
      bits.push(`${n} food item${n === 1 ? "" : "s"}`);
    } else if (meals.length > 1) {
      bits.push(`${meals.length} meals`);
    }
    if (acts.length === 1) {
      const n = acts[0].items.length;
      bits.push(
        `${n} activit${n === 1 ? "y" : "ies"} · ${round1(acts[0].totalCaloriesBurned)} kcal burned`
      );
    } else if (acts.length > 1) {
      const kcal = acts.reduce((sum, act) => sum + (Number(act.totalCaloriesBurned) || 0), 0);
      bits.push(`${acts.length} activities · ${round1(kcal)} kcal burned`);
    }
    return bits.length ? `Logged ${bits.join(" and ")}` : "Logged";
  }

  function logQuickAction(action) {
    state = ensureToday(state);
    if (action.parsed) {
      const parsed = clonePayload(action.parsed);
      const raw = action.prompt || action.label;
      lastLoggedIds = { meals: [], activities: [] };
      const kind = isActivityPayload(parsed) ? "activity" : "food";
      if (kind === "activity" && !confirmIfDuplicateActivity(parsed)) {
        setHint(els.logHint, "Duplicate activity not logged.");
        return;
      }
      if (kind === "activity") {
        commitActivityLog(parsed, raw);
      } else {
        commitMealLog(parsed, raw);
      }
      persist();
      revealLoggedKind(kind);
      renderAll();
      const msg = `Logged ${action.label}`;
      setHint(els.logHint, msg, true);
      showToast(msg, true);
      focusNewEntry(kind);
      return;
    }
    handleLog(action.prompt);
  }

  function qaParsedKey(parsed) {
    if (!parsed?.items?.length) return "";
    return parsed.items
      .map((item) =>
        [
          item.name,
          item.calories,
          item.protein,
          item.fat,
          item.carbs,
          item.fiber,
          item.caloriesBurned,
          item.durationMin,
        ].join(":")
      )
      .join("|");
  }

  function quickActionFromMeal(meal) {
    const parsed = sanitizeQaMealParsed(meal);
    if (!parsed) return null;
    const names = (meal.items || []).map((item) => item.name).filter(Boolean);
    const prompt = String(meal.rawText || names.join(", ") || "Meal").trim().slice(0, 500);
    return { id: uid(), label: "", prompt, parsed };
  }

  function quickActionFromActivity(act) {
    const parsed = sanitizeQaActivityParsed({
      items: act.items,
      totalCaloriesBurned: act.totalCaloriesBurned,
      summary: act.summary,
    });
    if (!parsed && (act.totalCaloriesBurned || act.text)) {
      const fallback = sanitizeQaActivityParsed({
        items: [
          {
            name: act.text || act.summary || "Activity",
            durationMin: 0,
            caloriesBurned: act.totalCaloriesBurned || 0,
            intensity: "moderate",
          },
        ],
        totalCaloriesBurned: act.totalCaloriesBurned || 0,
        summary: act.summary || "",
      });
      if (!fallback) return null;
      const prompt = String(act.rawText || act.text || "Exercise").trim().slice(0, 500);
      return { id: uid(), label: "", prompt, parsed: fallback };
    }
    if (!parsed) return null;
    const names = (act.items || []).map((item) => item.name).filter(Boolean);
    const prompt = String(act.rawText || act.text || names.join(", ") || "Exercise")
      .trim()
      .slice(0, 500);
    return { id: uid(), label: "", prompt, parsed };
  }

  function closeQaSlotModal() {
    pendingQaSave = null;
    if (els.qaSlotName) els.qaSlotName.value = "";
    setHint(els.qaSlotHint, "");
    if (els.qaSlotModal) els.qaSlotModal.hidden = true;
  }

  function namedPendingAction() {
    const label = (els.qaSlotName?.value || "").trim().slice(0, 40);
    if (!label) {
      setHint(els.qaSlotHint, "Name this shortcut before saving.");
      els.qaSlotName?.focus();
      return null;
    }
    if (!pendingQaSave?.action) return null;
    setHint(els.qaSlotHint, "");
    return { ...pendingQaSave.action, label };
  }

  function commitQuickActionSlot(type, index, action) {
    const next = sanitizeQuickActions(state.quickActions);
    next[type][index] = {
      id: action.id || uid(),
      label: action.label,
      prompt: action.prompt,
      parsed: action.parsed,
    };
    state.quickActions = sanitizeQuickActions(next);
    persist();
    renderQuickActions();
    if (settingsSection === "quick") renderQaEditor();
    closeQaSlotModal();
    const where = type === "activity" ? "Exercise" : "Nutrition";
    showToast(`Saved ${action.label} — tap it on ${where} to log instantly`, true);
  }

  function showQaReplaceChoices(type) {
    const slots = sanitizeQuickActions(state.quickActions)[type];
    if (els.qaSlotLead) {
      els.qaSlotLead.textContent =
        type === "activity"
          ? "All 3 exercise shortcuts are full. Pick one to replace."
          : "All 3 nutrition shortcuts are full. Pick one to replace.";
    }
    if (els.qaSlotSave) els.qaSlotSave.hidden = true;
    if (els.qaSlotChoices) {
      els.qaSlotChoices.hidden = false;
      els.qaSlotChoices.innerHTML = slots
        .map((slot, i) => {
          const kcal =
            type === "activity"
              ? slot.parsed
                ? `${round1(slot.parsed.totalCaloriesBurned)} kcal`
                : ""
              : slot.parsed
                ? `${round1(slot.parsed.totalCalories)} kcal`
                : "";
          const name = slot.label || slot.prompt || "Empty slot";
          return `<button type="button" class="btn btn-ghost qa-replace-btn" data-qa-replace="${i}">
            ${i + 1}. ${escapeHtml(name)}${kcal ? ` · ${kcal}` : ""}
          </button>`;
        })
        .join("");
    }
  }

  function openQaNameModal(type, action) {
    pendingQaSave = { type, action };
    if (els.qaSlotName) {
      els.qaSlotName.value = "";
      els.qaSlotName.placeholder =
        type === "activity" ? "e.g. Morning walk" : "e.g. Breakfast";
    }
    if (els.qaSlotLead) {
      els.qaSlotLead.textContent =
        "Give it a name you will recognize. This becomes the button label.";
    }
    if (els.qaSlotSave) els.qaSlotSave.hidden = false;
    if (els.qaSlotChoices) {
      els.qaSlotChoices.hidden = true;
      els.qaSlotChoices.innerHTML = "";
    }
    setHint(els.qaSlotHint, "");
    if (els.qaSlotModal) els.qaSlotModal.hidden = false;
    setTimeout(() => els.qaSlotName?.focus(), 50);
  }

  function saveNamedQuickAction() {
    const action = namedPendingAction();
    if (!action || !pendingQaSave) return;
    const type = pendingQaSave.type;
    const slots = sanitizeQuickActions(state.quickActions)[type];
    const empty = slots.findIndex((slot) => !slot.parsed && !slot.prompt && !slot.label);
    if (empty !== -1) {
      commitQuickActionSlot(type, empty, action);
      return;
    }
    pendingQaSave.action = action;
    showQaReplaceChoices(type);
  }

  function saveEntryAsQuickAction(type, id) {
    const day = today();
    const entry =
      type === "activity"
        ? day.activities.find((item) => item.id === id)
        : day.meals.find((item) => item.id === id);
    if (!entry) return;
    const action =
      type === "activity" ? quickActionFromActivity(entry) : quickActionFromMeal(entry);
    if (!action) {
      showToast("This entry doesn’t have enough detail to save as a shortcut.", false);
      return;
    }
    const slots = sanitizeQuickActions(state.quickActions)[type];
    const duplicate = slots.find(
      (slot) => slot.parsed && qaParsedKey(slot.parsed) === qaParsedKey(action.parsed)
    );
    if (duplicate) {
      showToast(`${duplicate.label} is already a quick action`, true);
      return;
    }
    openQaNameModal(type, action);
  }

  function renderStreak() {
    const streak = getStreak(state);
    els.streakCount.textContent = String(streak);
    els.streakSub.textContent =
      streak === 0
        ? "Log a meal, activity, or weight to start a streak"
        : streak === 1
          ? "1 day with an entry"
          : `${streak} days with entries`;
    // Best can be slower; paint current streak first so logging always updates the count.
    let best = streak;
    try {
      best = getBestStreak(state);
    } catch {
      /* keep streak as floor */
    }
    els.streakBest.textContent = `Best ${best}`;
  }

  function budgetBar({ value, base, extended, fillClass, showMark, deficitUntil = 0 }) {
    const goal = Math.max(0, Number(base) || 0);
    const ext = Math.max(Number(extended) || 0, goal);
    const def = Math.max(0, Number(deficitUntil) || 0);
    const eaten = Math.max(0, Number(value) || 0);
    const scale = Math.max(ext, def, eaten, 0.0001);
    const pct = (n) => Math.max(0, Math.min(100, (n / scale) * 100));
    const goalPct = pct(goal);
    const extPct = pct(ext);
    const defPct = def > 0 ? pct(def) : 0;
    const eatenClamped = Math.min(eaten, scale);
    const baseFill = Math.min(eatenClamped, goal);
    const bonusFill = Math.max(0, Math.min(eatenClamped, ext) - goal);
    const coastFill = def > ext ? Math.max(0, Math.min(eatenClamped, def) - ext) : 0;
    const surplusFill = def > 0 ? Math.max(0, eatenClamped - Math.max(ext, def)) : 0;
    const over = eaten > Math.max(ext, def) + 0.05;
    const showGoalMark = goal > 0 && goalPct < 99.2;
    const showDeficitMark = def > goal + 20;
    const showBurnMark = false;
    return `
      <div class="budget-track${showMark || showDeficitMark ? " has-burn" : ""}${over ? " is-over" : ""}${showDeficitMark ? " has-deficit" : ""}" aria-hidden="true">
        <div class="budget-well">
          ${showDeficitMark ? `<div class="budget-deficit-zone" style="width:${defPct.toFixed(2)}%"></div>` : ""}
          ${showMark ? `<div class="budget-zone" style="left:${goalPct.toFixed(2)}%;width:${Math.max(0, extPct - goalPct).toFixed(2)}%"></div>` : ""}
          <div class="${fillClass}" style="width:${pct(baseFill).toFixed(2)}%"></div>
          ${
            bonusFill > 0.15
              ? `<div class="${fillClass} budget-fill-bonus" style="left:${goalPct.toFixed(2)}%;width:${pct(bonusFill).toFixed(2)}%"></div>`
              : ""
          }
          ${
            coastFill > 0.15
              ? `<div class="${fillClass} budget-fill-coast" style="left:${extPct.toFixed(2)}%;width:${pct(coastFill).toFixed(2)}%"></div>`
              : ""
          }
          ${
            surplusFill > 0.15
              ? `<div class="macro-fill budget-fill-surplus" style="left:${pct(Math.max(ext, def)).toFixed(2)}%;width:${pct(surplusFill).toFixed(2)}%"></div>`
              : ""
          }
        </div>
        ${showGoalMark ? `<div class="budget-mark" style="left:${goalPct.toFixed(2)}%"></div>` : ""}
        ${showBurnMark ? `<div class="budget-mark burn" style="left:${extPct.toFixed(2)}%"></div>` : ""}
        ${showDeficitMark ? `<div class="budget-mark deficit" style="left:${defPct.toFixed(2)}%"></div>` : ""}
      </div>
    `;
  }

  function renderEnergy() {
    const energy = dayEnergy(today(), state);
    const t = energy.targets;
    const remaining = energy.remaining;
    const foodKcal = energy.food.calories;
    const burned = energy.burned;
    const bonus = energy.bonus || window.MMC.burnBonus(t, burned);
    const budget = bonus.extended.calories;
    const deficitUntil = energy.deficitUntil;
    const cutting = deficitUntil != null && deficitUntil > t.calories + 20;
    const intoBurn = burned > 0 && foodKcal > t.calories && remaining >= 0;
    const pastMaint = cutting && foodKcal > deficitUntil;

    let remClass = "";
    let amount = round1(Math.abs(remaining));
    let status = "left today";
    if (pastMaint) {
      remClass = "over";
      amount = round1(foodKcal - deficitUntil);
      status = "over maintenance";
    } else if (cutting && foodKcal > t.calories) {
      remClass = "in-deficit";
      amount = round1(deficitUntil - foodKcal);
      status = "in deficit";
    } else if (remaining < 0) {
      remClass = "over";
      status = burned > 0 ? "over budget" : "over goal";
    } else if (intoBurn) {
      remClass = "into-burn";
      status = "of burn left";
    } else if (Math.abs(remaining) <= t.calories * 0.1) {
      remClass = "on-track";
    }

    const showMark = burned > 0;
    const maint = energy.maintenance;
    const valueRight = `of ${t.calories}`;

    const tdeeCell =
      maint != null
        ? `<span class="tdee">TDEE ${infoI("tdee")}<strong>${round1(maint)}</strong></span>`
        : "";
    const deficitCell =
      energy.deficit != null
        ? energy.deficit >= 0
          ? `<span class="deficit">Deficit ${infoI("deficit")}<strong>${round1(energy.deficit)}</strong></span>`
          : `<span class="surplus">Surplus ${infoI("surplus")}<strong>${round1(Math.abs(energy.deficit))}</strong></span>`
        : "";

    els.energyCard.innerHTML = `
      <div class="energy-hero">
        <div class="energy-hero-copy">
          <div class="energy-hero-value ${remClass}">${amount}</div>
          <div class="energy-hero-label">${status}</div>
        </div>
      </div>
      <div class="energy-budget">
        ${budgetBar({
          value: foodKcal,
          base: t.calories,
          extended: budget,
          fillClass: "macro-fill calories",
          showMark,
          deficitUntil: cutting ? deficitUntil : 0,
        })}
        <div class="energy-budget-values">
          <span>${round1(foodKcal)} eaten</span>
          <span>${valueRight}</span>
        </div>
      </div>
      <details class="energy-details" ${energyDetailsOpen ? "open" : ""}>
        <summary>Goal, TDEE &amp; breakdown</summary>
        <div class="energy-hero-meta energy-hero-meta-details">
          <div>Goal ${t.calories} kcal ${infoI("goal")}</div>
          ${maint != null ? `<div class="energy-hero-tdee">TDEE ${round1(maint)} kcal ${infoI("tdee")}</div>` : ""}
          ${showMark ? `<div class="energy-hero-burn">+${round1(burned)} from activity ${infoI("burned")}</div>` : ""}
        </div>
        ${
          cutting
            ? `<p class="budget-legend">White line is your daily goal. Teal line is TDEE plus today’s burn — eat up to there and you’re still in a deficit.</p>`
            : ""
        }
        <div class="energy-strip">
          <span>Food ${infoI("food")}<strong>${round1(foodKcal)}</strong></span>
          <span class="burn">Burned ${infoI("burned")}<strong>${round1(burned)}</strong></span>
          <span>Net ${infoI("net")}<strong>${round1(energy.netCalories)}</strong></span>
        </div>
        ${
          tdeeCell || deficitCell
            ? `<div class="energy-strip energy-strip-tdee">${tdeeCell}${deficitCell}</div>`
            : ""
        }
      </details>
    `;
    const details = els.energyCard.querySelector(".energy-details");
    details?.addEventListener("toggle", () => {
      energyDetailsOpen = details.open;
    });
  }

  function renderMacros() {
    const energy = dayEnergy(today(), state);
    const totals = energy.food;
    const burned = energy.burned;
    const bonus = energy.bonus || window.MMC.burnBonus(energy.targets, burned);
    const showMark = burned > 0;

    const rows = macroMeta()
      .map((meta) => {
        const value = totals[meta.key];
        const scalesWithBurn = meta.key !== "fiber";
        const base = meta.target;
        const extended = scalesWithBurn ? bonus.extended[meta.key] : base;
        const markThis = showMark && scalesWithBurn;
        let rowClass = "macro-row";
        let fillClass = `macro-fill ${meta.key}`;

        if (meta.key === "fat") {
          const ratio = value / Math.max(extended, 0.0001);
          if (ratio >= 1) {
            rowClass += " fat-over";
            fillClass += " over";
          } else if (ratio >= 0.85) {
            rowClass += " fat-warn";
            fillClass += " warn";
          }
        }

        const shownTarget = markThis ? extended : base;
        const targetLabel =
          meta.mode === "minimum"
            ? `>${shownTarget}`
            : meta.mode === "ceiling"
              ? `≤${shownTarget}`
              : String(shownTarget);

        return `
          <div class="${rowClass}">
            <div class="macro-name">${meta.label} ${infoI(meta.key === "fat" ? "fat" : meta.key)}</div>
            ${budgetBar({
              value,
              base,
              extended,
              fillClass,
              showMark: markThis,
            })}
            <div class="macro-values">${round1(value)} <span>/ ${targetLabel} ${meta.unit}</span></div>
          </div>
        `;
      })
      .join("");

    const legend = showMark
      ? `<p class="budget-legend">The line is your daily goal. Past it uses calories you burned, at the same macro ratio.</p>`
      : "";

    els.macros.innerHTML = rows + legend;
  }

  function renderMeals() {
    const meals = today().meals;
    els.emptyState.hidden = meals.length > 0;
    if (els.resetDayBtn) {
      const hasAnything =
        meals.length > 0 || today().activities.length > 0;
      els.resetDayBtn.hidden = !hasAnything;
    }
    els.mealList.innerHTML = [...meals]
      .reverse()
      .map((meal) => {
        const names = (meal.items || [])
          .map((item) => escapeHtml(item.name))
          .join(", ");

        return `
          <li class="meal-item${lastLoggedIds.meals.includes(meal.id) ? " is-new" : ""}">
            <div class="meal-top">
              <div>
                <div class="meal-time">${formatTime(meal.loggedAt)}</div>
                <div class="activity-name">${names || "Meal"}</div>
              </div>
              <div class="entry-actions">
                <button type="button" class="meal-edit" data-qa-from-meal="${meal.id}">Add Shortcut</button>
                <button type="button" class="meal-edit" data-edit-meal="${meal.id}">Edit</button>
                <button type="button" class="meal-delete" data-delete-meal="${meal.id}">Delete</button>
              </div>
            </div>
            <div class="meal-totals">
              <span>${round1(meal.totalCalories)} kcal</span>
              <span>P ${round1(meal.totalProtein)}g</span>
              <span>F ${round1(meal.totalFat)}g</span>
              <span>C ${round1(meal.totalCarbs)}g</span>
              <span>Fib ${round1(meal.totalFiber)}g</span>
            </div>
          </li>
        `;
      })
      .join("");
  }

  function stripAssumptionNotes(name) {
    return String(name || "")
      .replace(/\(([^)]*assumed[^)]*)\)/gi, (_, inner) => {
        const facts = inner
          .replace(/,?\s*assumed[^,]*/gi, "")
          .replace(/^[\s,]+|[\s,]+$/g, "")
          .trim();
        return facts;
      })
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function formatAssumptionLabel(raw) {
    const text = String(raw || "").trim();
    const mins = text.match(/(\d+(?:\.\d+)?)\s*min/i);
    if (mins) return `${mins[1]} min assumed`;
    return text.replace(/^\(?|\)$/g, "").trim();
  }

  function assumptionNotesFromName(name) {
    return [...String(name || "").matchAll(/\(([^)]*assumed[^)]*)\)/gi)].map((m) =>
      formatAssumptionLabel(m[1])
    );
  }

  function textHasDuration(text) {
    return /\b\d+(?:\.\d+)?\s*(min|mins|minute|minutes|hr|hrs|hour|hours)\b/i.test(
      String(text || "")
    );
  }

  function durationAssumption(item, act) {
    const fromName = assumptionNotesFromName(item?.name || "");
    if (fromName.length) return fromName[0];
    const mins = Number(item?.durationMin) || 0;
    const source = act?.rawText || act?.text || "";
    if (mins && !textHasDuration(source)) return `${round1(mins)} min assumed`;
    if (!mins) return "Duration assumed";
    return "";
  }

  function activityTitle(act) {
    const label = String(act?.label || "").trim();
    if (label && label.toLowerCase() !== "activity") return label;
    const first = act?.items?.[0]?.name;
    const cleaned = stripAssumptionNotes(first || "");
    if (cleaned) return cleaned;
    const summary = stripAssumptionNotes(act?.summary || act?.text || "");
    return summary || "Activity";
  }

  function activityScanKey(act) {
    const raw = [
      act?.label || "",
      act?.summary || "",
      act?.text || "",
      act?.rawText || "",
      ...(Array.isArray(act?.items) ? act.items.map((item) => item.name || "") : []),
    ]
      .join(" ")
      .toLowerCase();
    const miles = raw.match(/(\d+(?:\.\d+)?)\s*(?:mi(?:le)?s?)\b/);
    let kind = "";
    if (/\b(walk|walking)\b/.test(raw)) kind = "walk";
    else if (/\b(run|running|jog|jogging)\b/.test(raw)) kind = "run";
    else if (/\b(lift|weights|strength|workout)\b/.test(raw)) kind = "lift";
    else {
      kind = stripAssumptionNotes(act?.items?.[0]?.name || act?.label || act?.text || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }
    const mins = (Array.isArray(act?.items) ? act.items : []).reduce(
      (n, item) => n + (Number(item.durationMin) || 0),
      0
    );
    return {
      kind,
      miles: miles ? Number(miles[1]) : null,
      mins,
    };
  }

  function isNearDuplicateActivity(a, b) {
    const x = activityScanKey(a);
    const y = activityScanKey(b);
    if (!x.kind || !y.kind || x.kind !== y.kind) return false;
    if (x.miles != null && y.miles != null && x.miles !== y.miles) return false;
    if (x.mins && y.mins && Math.abs(x.mins - y.mins) > 5) return false;
    return true;
  }

  function findNearDuplicateActivity(parsed) {
    return today().activities.find((act) => isNearDuplicateActivity(act, parsed)) || null;
  }

  function confirmIfDuplicateActivity(parsed) {
    const hit = findNearDuplicateActivity(parsed);
    if (!hit) return true;
    const title = activityTitle(hit);
    const when = formatTime(hit.loggedAt);
    const kcal = round1(hit.totalCaloriesBurned || 0);
    return window.confirm(
      `You already logged ${title} today at ${when} (${kcal} kcal burned). Log another?`
    );
  }

  function renderActivities() {
    const activities = today().activities;
    els.activityEmpty.hidden = activities.length > 0;
    els.activityList.innerHTML = [...activities]
      .reverse()
      .map((act) => {
        const items = Array.isArray(act.items) ? act.items : [];
        const title = activityTitle(act);
        const rows = (items.length
          ? items
          : [
              {
                name: act.text || act.summary || "Activity",
                durationMin: 0,
                caloriesBurned: act.totalCaloriesBurned,
                intensity: "",
              },
            ]
        )
          .map((item) => {
            const clean = stripAssumptionNotes(item.name || "") || item.name || "Activity";
            const assumed = durationAssumption(item, act);
            const mins = item.durationMin ? `${round1(item.durationMin)} min` : "";
            const intensity = item.intensity || "";
            const showName = clean && clean.toLowerCase() !== title.toLowerCase();
            const bits = [showName ? escapeHtml(clean) : "", mins, intensity]
              .filter(Boolean)
              .join(" · ");
            const chip = assumed
              ? `<button type="button" class="assumption-chip" data-edit-activity="${act.id}">${escapeHtml(assumed)}</button>`
              : "";
            return `<li><div class="activity-line">${bits}${chip}</div></li>`;
          })
          .join("");

        return `
          <li class="meal-item activity-item${lastLoggedIds.activities.includes(act.id) ? " is-new" : ""}">
            <div class="meal-top">
              <div>
                <div class="activity-name">${escapeHtml(title)}</div>
                <div class="meal-time">${formatTime(act.loggedAt)}</div>
              </div>
              <div class="entry-actions">
                <button type="button" class="meal-edit" data-qa-from-activity="${act.id}">Add Shortcut</button>
                <button type="button" class="meal-edit" data-edit-activity="${act.id}">Edit</button>
                <button type="button" class="meal-delete" data-delete-activity="${act.id}">Delete</button>
              </div>
            </div>
            <ul class="meal-items">${rows}</ul>
            <div class="activity-meta">${round1(act.totalCaloriesBurned || 0)} kcal burned</div>
          </li>
        `;
      })
      .join("");
  }

  function renderTrend(span, chartEl, statsEl, hitEl) {
    const t = targets();
    const series = trendSeries(state, span);
    const hits = series.filter((d) => d.hit).length;
    const logged = series.filter((d) => d.logged);
    hitEl.textContent = `${hits}/${span} hit`;

    const maxCal = Math.max(t.calories * 1.15, ...series.map((d) => d.totals.calories), 1);
    const targetPct = (t.calories / maxCal) * 100;

    chartEl.innerHTML = `
      <div class="chart-target" style="bottom:${targetPct}%"></div>
      <div class="chart-bars">
        ${series
          .map((d) => {
            const h = Math.max(2, (d.totals.calories / maxCal) * 100);
            const cls = [
              "chart-bar",
              d.hit ? "hit" : "",
              d.logged && !d.hit ? "miss" : "",
              !d.logged ? "empty" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return `
              <div class="chart-col" title="${d.key}: net ${round1(d.totals.calories)} · food ${round1(d.food.calories)} · burn ${round1(d.burned)}">
                <div class="${cls}" style="height:${h}%"></div>
                <div class="chart-label">${d.label}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    const avgNet = avg(logged.map((d) => d.totals.calories));
    const burnDays = series.filter((d) => d.burned > 0 || d.logged);
    const avgBurn = avg(burnDays.map((d) => d.burned));
    const avgProtein = avg(logged.map((d) => d.food.protein));
    const totalBurn = series.reduce((n, d) => n + d.burned, 0);

    statsEl.innerHTML = `
      <div class="stat"><span>Avg net kcal</span><strong>${logged.length ? round1(avgNet) : "—"}</strong></div>
      <div class="stat"><span>Avg protein</span><strong>${logged.length ? round1(avgProtein) + "g" : "—"}</strong></div>
      <div class="stat"><span>Avg burn</span><strong>${series.some((d) => d.burned) ? round1(avgBurn) : "—"}</strong></div>
      <div class="stat"><span>Total burn</span><strong>${round1(totalBurn)}</strong></div>
    `;
  }

  function renderTrends() {
    const t = targets();
    renderTrend(7, els.weekChart, els.weekStats, els.weekHitRate);
    renderTrend(30, els.monthChart, els.monthStats, els.monthHitRate);
    els.goalLegendMonth.textContent = `Goal day: net kcal ±10% of ${t.calories}, protein ≥${t.protein}g, carbs ≥${t.carbs}g, fiber >${t.fiber}g, fat ≤${t.fat}g`;
  }

  function renderWeightChart(series, goalValue) {
    if (!series.length) {
      els.weightChart.innerHTML = `<div class="weight-chart-empty">Log weights to see your trendline</div>`;
      return;
    }

    const w = 320;
    const h = 160;
    const padL = 36;
    const padR = 12;
    const padT = 14;
    const padB = 28;
    const values = series.map((p) => p.weight);
    if (goalValue != null && Number.isFinite(goalValue)) {
      values.push(goalValue);
    }
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    min -= span * 0.08;
    max += span * 0.08;

    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const points = series.map((p, i) => {
      const x =
        padL + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
      const y = padT + ((max - p.weight) / (max - min)) * innerH;
      return { x, y, ...p };
    });

    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    const area =
      `${line} L${points[points.length - 1].x.toFixed(1)},${(padT + innerH).toFixed(1)} ` +
      `L${points[0].x.toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

    const yTicks = [max, (max + min) / 2, min].map((v) => {
      const y = padT + ((max - v) / (max - min)) * innerH;
      return `<text x="${padL - 6}" y="${y + 3}" text-anchor="end" fill="#5c6778" font-size="9" font-family="JetBrains Mono, monospace">${round1(v)}</text>
        <line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#2a3340" stroke-width="1" />`;
    });

    const xLabels = points
      .filter(
        (_, i) =>
          series.length <= 6 ||
          i === 0 ||
          i === points.length - 1 ||
          i % Math.ceil(points.length / 4) === 0
      )
      .map((p) => {
        const [, mo, day] = p.date.split("-");
        return `<text x="${p.x}" y="${h - 8}" text-anchor="middle" fill="#5c6778" font-size="9" font-family="JetBrains Mono, monospace">${Number(mo)}/${Number(day)}</text>`;
      });

    const dots = points
      .map(
        (p) =>
          `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--accent)" stroke="#0c0e12" stroke-width="1.5">
            <title>${p.date}: ${round1(p.weight)} ${p.unit}</title>
          </circle>`
      )
      .join("");

    const goalY =
      goalValue != null && Number.isFinite(goalValue)
        ? padT + ((max - goalValue) / (max - min)) * innerH
        : null;
    const goalLine =
      goalY == null
        ? ""
        : `<line x1="${padL}" y1="${goalY.toFixed(1)}" x2="${w - padR}" y2="${goalY.toFixed(1)}" stroke="var(--accent)" stroke-width="1.25" stroke-dasharray="4 3" opacity="0.85"></line>
        <text x="${w - padR}" y="${(goalY - 4).toFixed(1)}" text-anchor="end" fill="var(--accent)" font-size="9" font-family="DM Sans, sans-serif">goal</text>`;

    els.weightChart.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Weight trendline">
        ${yTicks.join("")}
        ${goalLine}
        <path d="${area}" fill="color-mix(in srgb, var(--accent) 12%, transparent)"></path>
        <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"></path>
        ${dots}
        ${xLabels.join("")}
      </svg>
    `;
  }

  function renderWeight() {
    const stats = weightStats(state);
    const unit = stats.latest?.unit || state.weightUnit || "lb";
    els.weightDateLabel.textContent = formatWeightDate(todayKey());

    const goal = sanitizeGoalWeight(state.goalWeight);
    const goalDisplay =
      goal && unit ? convertWeight(goal.weight, goal.unit, unit) : null;

    if (stats.delta == null) {
      els.weightDelta.textContent = "—";
    } else {
      const sign = stats.delta > 0 ? "+" : "";
      els.weightDelta.textContent = `${sign}${stats.delta} ${unit}`;
      els.weightDelta.style.color =
        stats.delta < 0 ? "var(--green)" : stats.delta > 0 ? "var(--amber)" : "";
    }

    renderWeightChart(stats.series, goalDisplay);

    const latestDisplay = stats.latest
      ? convertWeight(stats.latest.weight, stats.latest.unit, unit)
      : null;
    let toGoLabel = "—";
    if (latestDisplay != null && goalDisplay != null) {
      const diff = round1(latestDisplay - goalDisplay);
      if (diff === 0) toGoLabel = "At goal";
      else if (diff > 0) toGoLabel = `${diff} ${unit} to go`;
      else toGoLabel = `${Math.abs(diff)} ${unit} to gain`;
    }

    els.weightStatsEl.innerHTML = `
      <div class="stat"><span>Latest</span><strong>${stats.latest ? `${round1(stats.latest.weight)} ${unit}` : "—"}</strong></div>
      <div class="stat"><span>Goal</span><strong>${goalDisplay != null ? `${goalDisplay} ${unit}` : "—"}</strong></div>
      <div class="stat"><span>To go</span><strong>${toGoLabel}</strong></div>
      <div class="stat"><span>Change</span><strong>${stats.delta == null ? "—" : `${stats.delta > 0 ? "+" : ""}${stats.delta} ${unit}`}</strong></div>
    `;

    if (els.goalWeightStatus) {
      els.goalWeightStatus.textContent = goal
        ? toGoLabel === "—"
          ? `Goal ${round1(goal.weight)} ${goal.unit}. Log a current weight to see the gap.`
          : `Goal ${round1(goal.weight)} ${goal.unit} · ${toGoLabel}.`
        : "Optional. Shows on the trendline and is sent with AI logs.";
    }
    if (els.goalWeightInput && document.activeElement !== els.goalWeightInput) {
      els.goalWeightInput.value = goal ? String(goal.weight) : "";
    }
    if (els.goalWeightUnit) {
      els.goalWeightUnit.value = goal?.unit || unit;
    }

    const reversed = [...stats.series].reverse();
    els.weightEmpty.hidden = reversed.length > 0;
    els.weightList.innerHTML = reversed
      .map(
        (entry) => `
        <li class="meal-item">
          <div class="meal-top">
            <div>
              <div class="weight-entry-date">${formatWeightDate(entry.date)}</div>
              <div class="weight-entry-value">${round1(entry.weight)} ${entry.unit}</div>
            </div>
            <div class="entry-actions">
              <button type="button" class="meal-edit" data-edit-weight="${entry.id}">Edit</button>
              <button type="button" class="meal-delete" data-delete-weight="${entry.id}">Delete</button>
            </div>
          </div>
        </li>
      `
      )
      .join("");
  }

  function renderAll() {
    if (!state) return;
    state = ensureToday(state);
    state.quickActions = sanitizeQuickActions(state.quickActions);
    applyTheme(state.theme);
    renderStreak();
    renderEnergy();
    renderMacros();
    renderMeals();
    renderActivities();
    renderTrends();
    renderWeight();
    syncAiGate();
    updateLogVisibility();
    renderQuickActions();
    updateLogJump();
  }

  async function handleLog(presetText) {
    state = ensureToday(state);
    if (!hasAiAccess()) {
      syncAiGate();
      showToast("AI is not available right now", false);
      return;
    }

    const fromQuick = typeof presetText === "string";
    const text = (fromQuick ? presetText : els.logInput.value).trim();
    if (!text) {
      setHint(els.logHint, "Describe a meal, a workout, or a whole day.");
      return;
    }

    setHint(els.logHint, "");
    setBusy(true);

    try {
      const result = await parseLogWithGrok({
        provider: state.provider,
        apiKey: getActiveApiKey(state),
        model: state.model,
        text,
        context: buildPersonContext(),
      });
      lastLoggedIds = { meals: [], activities: [] };
      (result.meals || []).forEach((meal) => commitMealLog(meal, text));
      const keptActs = [];
      for (const act of result.activities || []) {
        if (!confirmIfDuplicateActivity(act)) continue;
        keptActs.push(act);
        commitActivityLog(act, text);
      }
      if (!(result.meals || []).length && !keptActs.length) {
        setHint(els.logHint, "Duplicate activity not logged.");
        return;
      }
      persist();
      if (!fromQuick) els.logInput.value = "";
      const kind =
        keptActs.length && !(result.meals || []).length ? "activity" : result.kind;
      revealLoggedKind(kind);
      renderAll();
      const msg = logMessage({
        meals: result.meals || [],
        activities: keptActs,
        kind,
      });
      setHint(els.logHint, msg, true);
      showToast(msg, true);
      focusNewEntry(kind === "activity" ? "activity" : "food");
    } catch (err) {
      const providerLabel = AI_PROVIDERS[normalizeProvider(state.provider)]?.label || "AI";
      const msg = err.message || `Failed to parse with ${providerLabel}.`;
      setHint(els.logHint, msg);
      showToast(msg, false);
    } finally {
      setBusy(false);
    }
  }

  function handleWeightLog() {
    const raw = els.weightInput.value.trim();
    if (!raw) {
      setHint(els.weightHint, "Enter your weight.");
      return;
    }

    try {
      const entry = upsertWeight(state, {
        weight: raw,
        unit: els.weightUnit.value,
        date: todayKey(),
      });
      persist();
      els.weightInput.value = "";
      renderAll();
      const msg = `Saved ${round1(entry.weight)} ${entry.unit}`;
      setHint(
        els.weightHint,
        `${msg} for ${formatWeightDate(entry.date)}.`,
        true
      );
      showToast(msg, true);
    } catch (err) {
      setHint(els.weightHint, err.message || "Could not save weight.");
    }
  }

  function dropHistoryItem(kind, id) {
    const key = String(id || "");
    Object.values(state.history || {}).forEach((day) => {
      if (!day) return;
      if (kind === "meals") {
        day.meals = (day.meals || []).filter((m) => String(m.id) !== key);
      } else if (kind === "activities") {
        day.activities = (day.activities || []).filter((a) => String(a.id) !== key);
      }
    });
  }

  function deleteMeal(id) {
    if (!confirm("Delete this meal?")) return;
    invalidateDriveWrites();
    addTombstones(state, "meals", id);
    dropHistoryItem("meals", id);
    persist();
    renderAll();
    showToast("Meal deleted", true);
  }

  function deleteActivity(id) {
    if (!confirm("Delete this activity?")) return;
    invalidateDriveWrites();
    addTombstones(state, "activities", id);
    dropHistoryItem("activities", id);
    persist();
    renderAll();
    showToast("Activity deleted", true);
  }

  function deleteWeight(id) {
    if (!confirm("Delete this weight entry?")) return;
    invalidateDriveWrites();
    addTombstones(state, "weights", id);
    state.weights = (state.weights || []).filter((w) => String(w.id) !== String(id));
    persist();
    renderAll();
    showToast("Weight entry deleted", true);
  }

  function closeEditModal() {
    editTarget = null;
    els.editModal.hidden = true;
    els.editBody.innerHTML = "";
    setHint(els.editHint, "");
    els.editReparse.hidden = true;
    els.editSave.disabled = false;
    els.editReparse.disabled = false;
  }

  function openEditMeal(id) {
    const meal = today().meals.find((m) => m.id === id);
    if (!meal) return;
    editTarget = { type: "meal", id };
    els.editTitle.textContent = "Edit meal";
    els.editReparse.hidden = false;
    const items = Array.isArray(meal.items) ? meal.items : [];
    els.editBody.innerHTML = `
      <label>Original description
        <textarea id="edit-raw" class="field-input">${escapeHtml(meal.rawText || "")}</textarea>
      </label>
      <div class="field-help">Tweak items below, or change the description and use Re-parse with AI.</div>
      <div id="edit-items">
        ${items
          .map(
            (item, i) => `
          <div class="edit-item-card" data-item-index="${i}">
            <label>Name
              <input class="field-input" data-field="name" value="${escapeHtml(item.name || "")}" />
            </label>
            <div class="edit-item-grid">
              <label>Calories<input class="field-input" type="number" step="0.1" data-field="calories" value="${round1(item.calories || 0)}" /></label>
              <label>Protein<input class="field-input" type="number" step="0.1" data-field="protein" value="${round1(item.protein || 0)}" /></label>
              <label>Fat<input class="field-input" type="number" step="0.1" data-field="fat" value="${round1(item.fat || 0)}" /></label>
              <label>Carbs<input class="field-input" type="number" step="0.1" data-field="carbs" value="${round1(item.carbs || 0)}" /></label>
              <label>Fiber<input class="field-input" type="number" step="0.1" data-field="fiber" value="${round1(item.fiber || 0)}" /></label>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    setHint(els.editHint, "");
    els.editModal.hidden = false;
  }

  function openEditActivity(id) {
    const act = today().activities.find((a) => a.id === id);
    if (!act) return;
    editTarget = { type: "activity", id };
    els.editTitle.textContent = "Edit activity";
    els.editReparse.hidden = false;
    const items = Array.isArray(act.items) ? act.items : [];
    const itemsHtml =
      items.length > 0
        ? items
            .map(
              (item, i) => `
          <div class="edit-item-card" data-item-index="${i}">
            <label>Name
              <input class="field-input" data-field="name" value="${escapeHtml(item.name || "")}" />
            </label>
            <div class="edit-item-grid">
              <label>Minutes<input class="field-input" type="number" step="1" data-field="durationMin" value="${round1(item.durationMin || 0)}" /></label>
              <label>Calories burned<input class="field-input" type="number" step="0.1" data-field="caloriesBurned" value="${round1(item.caloriesBurned || 0)}" /></label>
              <label>Intensity
                <select class="field-input" data-field="intensity">
                  ${["low", "moderate", "high"]
                    .map(
                      (v) =>
                        `<option value="${v}" ${item.intensity === v ? "selected" : ""}>${v}</option>`
                    )
                    .join("")}
                </select>
              </label>
            </div>
          </div>
        `
            )
            .join("")
        : `<div class="edit-item-card" data-item-index="0">
            <label>Name<input class="field-input" data-field="name" value="${escapeHtml(act.text || "Activity")}" /></label>
            <div class="edit-item-grid">
              <label>Minutes<input class="field-input" type="number" step="1" data-field="durationMin" value="0" /></label>
              <label>Calories burned<input class="field-input" type="number" step="0.1" data-field="caloriesBurned" value="${round1(act.totalCaloriesBurned || 0)}" /></label>
              <label>Intensity
                <select class="field-input" data-field="intensity">
                  <option value="low">low</option>
                  <option value="moderate" selected>moderate</option>
                  <option value="high">high</option>
                </select>
              </label>
            </div>
          </div>`;

    els.editBody.innerHTML = `
      <label>Original description
        <textarea id="edit-raw" class="field-input">${escapeHtml(act.rawText || act.text || "")}</textarea>
      </label>
      <div class="field-help">Assumed minutes live here — change duration if the guess was wrong, or re-parse the description with AI.</div>
      <div id="edit-items">${itemsHtml}</div>
    `;
    setHint(els.editHint, "");
    els.editModal.hidden = false;
  }

  function openEditWeight(id) {
    const entry = (state.weights || []).find((w) => w.id === id);
    if (!entry) return;
    editTarget = { type: "weight", id };
    els.editTitle.textContent = "Edit weight";
    els.editReparse.hidden = true;
    els.editBody.innerHTML = `
      <div class="field-help">Date: <strong>${formatWeightDate(entry.date)}</strong></div>
      <div class="weight-row">
        <input type="number" id="edit-weight-value" class="field-input weight-input" step="0.1" min="1" value="${round1(entry.weight)}" />
        <select id="edit-weight-unit" class="field-input weight-unit">
          <option value="lb" ${entry.unit === "lb" ? "selected" : ""}>lb</option>
          <option value="kg" ${entry.unit === "kg" ? "selected" : ""}>kg</option>
        </select>
      </div>
    `;
    setHint(els.editHint, "");
    els.editModal.hidden = false;
  }

  function readMealEditsFromForm() {
    const rawText = document.getElementById("edit-raw")?.value.trim() || "";
    const cards = [...els.editBody.querySelectorAll(".edit-item-card")];
    const items = cards.map((card) => ({
      name: card.querySelector('[data-field="name"]').value.trim() || "Item",
      calories: Number(card.querySelector('[data-field="calories"]').value) || 0,
      protein: Number(card.querySelector('[data-field="protein"]').value) || 0,
      fat: Number(card.querySelector('[data-field="fat"]').value) || 0,
      carbs: Number(card.querySelector('[data-field="carbs"]').value) || 0,
      fiber: Number(card.querySelector('[data-field="fiber"]').value) || 0,
    }));
    const totals = items.reduce(
      (acc, item) => {
        acc.totalCalories += item.calories;
        acc.totalProtein += item.protein;
        acc.totalFat += item.fat;
        acc.totalCarbs += item.carbs;
        acc.totalFiber += item.fiber;
        return acc;
      },
      { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, totalFiber: 0 }
    );
    return { rawText, items, ...totals };
  }

  function readActivityEditsFromForm() {
    const rawText = document.getElementById("edit-raw")?.value.trim() || "";
    const cards = [...els.editBody.querySelectorAll(".edit-item-card")];
    const items = cards.map((card) => ({
      name: card.querySelector('[data-field="name"]').value.trim() || "Activity",
      durationMin: Number(card.querySelector('[data-field="durationMin"]').value) || 0,
      caloriesBurned: Number(card.querySelector('[data-field="caloriesBurned"]').value) || 0,
      intensity: card.querySelector('[data-field="intensity"]').value || "moderate",
    }));
    const totalCaloriesBurned = items.reduce((n, i) => n + i.caloriesBurned, 0);
    return { rawText, text: rawText, items, totalCaloriesBurned };
  }

  function saveEdit() {
    if (!editTarget) return;
    setHint(els.editHint, "");

    if (editTarget.type === "meal") {
      const meal = today().meals.find((m) => m.id === editTarget.id);
      if (!meal) return;
      const edits = readMealEditsFromForm();
      if (!edits.items.length) {
        setHint(els.editHint, "Add at least one food item.");
        return;
      }
      Object.assign(meal, edits);
      persist();
      renderAll();
      closeEditModal();
      return;
    }

    if (editTarget.type === "activity") {
      const act = today().activities.find((a) => a.id === editTarget.id);
      if (!act) return;
      const edits = readActivityEditsFromForm();
      Object.assign(act, edits);
      persist();
      renderAll();
      closeEditModal();
      return;
    }

    if (editTarget.type === "weight") {
      const entry = (state.weights || []).find((w) => w.id === editTarget.id);
      if (!entry) return;
      const value = Number(document.getElementById("edit-weight-value").value);
      const unit = document.getElementById("edit-weight-unit").value;
      if (!Number.isFinite(value) || value <= 0) {
        setHint(els.editHint, "Enter a valid weight.");
        return;
      }
      entry.weight = round1(value);
      entry.unit = unit === "kg" ? "kg" : "lb";
      entry.loggedAt = Date.now();
      state.weightUnit = entry.unit;
      persist();
      renderAll();
      closeEditModal();
    }
  }

  async function reparseEdit() {
    if (!editTarget || (editTarget.type !== "meal" && editTarget.type !== "activity")) return;
    const raw = document.getElementById("edit-raw")?.value.trim();
    if (!raw) {
      setHint(els.editHint, "Enter a description to re-parse.");
      return;
    }

    setHint(els.editHint, "");
    els.editSave.disabled = true;
    els.editReparse.disabled = true;
    els.editReparse.textContent = "Parsing…";

    try {
      if (editTarget.type === "meal") {
        const parsed = await parseMealWithGrok({
          provider: state.provider,
          apiKey: getActiveApiKey(state),
          model: state.model,
          text: raw,
          context: buildPersonContext(),
        });
        const meal = today().meals.find((m) => m.id === editTarget.id);
        if (!meal) return;
        Object.assign(meal, { rawText: raw, ...parsed });
        persist();
        renderAll();
        openEditMeal(editTarget.id);
        setHint(els.editHint, "Re-parsed. Review and Save if it looks right.", true);
      } else {
        const parsed = await parseActivityWithGrok({
          provider: state.provider,
          apiKey: getActiveApiKey(state),
          model: state.model,
          text: raw,
          context: buildPersonContext(),
        });
        const act = today().activities.find((a) => a.id === editTarget.id);
        if (!act) return;
        Object.assign(act, { rawText: raw, text: raw, ...parsed });
        persist();
        renderAll();
        openEditActivity(editTarget.id);
        setHint(els.editHint, "Re-parsed. Review and Save if it looks right.", true);
      }
    } catch (err) {
      setHint(els.editHint, err.message || "Re-parse failed.");
    } finally {
      els.editSave.disabled = false;
      els.editReparse.disabled = false;
      els.editReparse.textContent = "Re-parse with AI";
    }
  }

  function resetDay() {
    if (!confirm("Clear today's meals and activities?")) return;
    invalidateDriveWrites();
    const day = today();
    addTombstones(state, "meals", (day.meals || []).map((m) => m.id));
    addTombstones(state, "activities", (day.activities || []).map((a) => a.id));
    day.meals = [];
    day.activities = [];
    persist();
    renderAll();
    setHint(els.logHint, "Day reset.", true);
  }

  function saveGoals() {
    state.goals = sanitizeGoals({
      calories: els.goalCalories.value,
      protein: els.goalProtein.value,
      fat: els.goalFat.value,
      carbs: els.goalCarbs.value,
      fiber: els.goalFiber.value,
      maintenance: els.goalMaintenance?.value,
    });
    persist();
    renderAll();
    fillSettingsForm();
    setHint(els.goalsHint, "Goals updated. Progress and trends now use these targets.", true);
  }

  function selectedMacroSex() {
    const active = els.macroSexPicks?.querySelector(".sex-pick.active");
    return active?.getAttribute("data-macro-sex") || "";
  }

  function paintChoiceGroup(root, attr, value) {
    if (!root) return;
    root.querySelectorAll(`[${attr}]`).forEach((btn) => {
      const on = btn.getAttribute(attr) === String(value);
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function ensureMacroChoices() {
    const levels = ACTIVITY_LEVELS || window.MMC.ACTIVITY_LEVELS || [];
    const strategies = NUTRITION_STRATEGIES || window.MMC.NUTRITION_STRATEGIES || [];
    if (els.macroActivityPicks && !els.macroActivityPicks.childElementCount) {
      els.macroActivityPicks.innerHTML = levels.map(
        (level) => `
          <button type="button" class="choice-pick" data-macro-pal="${level.pal}" role="radio" aria-checked="false">
            <span class="choice-name">${level.name}</span>
            <span class="choice-hint">${level.hint}</span>
          </button>
        `
      ).join("");
    }
    if (els.macroStrategyPicks && !els.macroStrategyPicks.childElementCount) {
      els.macroStrategyPicks.innerHTML = strategies.map(
        (strat) => `
          <button type="button" class="choice-pick" data-macro-strategy="${strat.id}" role="radio" aria-checked="false">
            <span class="choice-name">${strat.name}</span>
            <span class="choice-hint">${strat.short}</span>
          </button>
        `
      ).join("");
    }
  }

  function paintMacroForm() {
    if (!els.macroWeight) return;
    ensureMacroChoices();
    const profile = sanitizeProfile(state?.profile);
    const unit = state?.weightUnit === "kg" ? "kg" : "lb";
    if (els.macroWeightUnit) els.macroWeightUnit.value = unit;
    if (els.macroGoalUnit) els.macroGoalUnit.value = unit;
    const latest = weightStats(state).latest;
    if (els.macroWeight) {
      if (latest) {
        const w = convertWeight(latest.weight, latest.unit, unit);
        els.macroWeight.value = w ?? "";
      } else {
        els.macroWeight.value = "";
      }
    }
    const goal = sanitizeGoalWeight(state?.goalWeight);
    if (els.macroGoal) {
      if (goal) {
        const g = convertWeight(goal.weight, goal.unit, unit);
        els.macroGoal.value = g ?? "";
      } else {
        els.macroGoal.value = "";
      }
    }
    const heightUnit = profile.heightUnit === "cm" ? "cm" : "in";
    if (els.macroHeightUnit) els.macroHeightUnit.value = heightUnit;
    if (els.macroHeight) {
      if (profile.heightIn) {
        els.macroHeight.value =
          heightUnit === "cm" ? round1(profile.heightIn * 2.54) : profile.heightIn;
      } else {
        els.macroHeight.value = "";
      }
    }
    if (els.macroBf) els.macroBf.value = profile.bodyFat != null ? profile.bodyFat : "";
    if (els.macroAge) els.macroAge.value = profile.age || els.profileAge?.value || "";
    paintChoiceGroup(els.macroSexPicks, "data-macro-sex", profile.sex || selectedProfileSex());
    paintChoiceGroup(els.macroActivityPicks, "data-macro-pal", profile.activityPal || "");
    paintChoiceGroup(els.macroStrategyPicks, "data-macro-strategy", profile.strategy || "");
    refreshMacroCalc();
  }

  function readMacroInput() {
    const weightUnit = els.macroWeightUnit?.value === "kg" ? "kg" : "lb";
    const goalUnit = els.macroGoalUnit?.value === "kg" ? "kg" : "lb";
    const heightUnit = els.macroHeightUnit?.value === "cm" ? "cm" : "in";
    const current = convertWeight(els.macroWeight?.value, weightUnit, "lb");
    const goal = convertWeight(els.macroGoal?.value, goalUnit, "lb");
    const heightIn = sanitizeHeightInches(els.macroHeight?.value, heightUnit);
    const palBtn = els.macroActivityPicks?.querySelector(".choice-pick.active");
    const stratBtn = els.macroStrategyPicks?.querySelector(".choice-pick.active");
    return {
      currentLb: current,
      goalLb: goal,
      heightIn,
      sex: selectedMacroSex(),
      bodyFat: els.macroBf?.value,
      age: els.macroAge?.value,
      pal: palBtn?.getAttribute("data-macro-pal"),
      strategy: stratBtn?.getAttribute("data-macro-strategy"),
    };
  }

  function refreshMacroCalc() {
    if (!els.macroResults) return;
    const result = calculateMacros(readMacroInput());
    if (!result.ok) {
      els.macroResults.hidden = true;
      els.macroResults.innerHTML = "";
      if (els.macroApplyBtn) els.macroApplyBtn.disabled = true;
      lastMacroResult = null;
      const started =
        els.macroWeight?.value ||
        els.macroGoal?.value ||
        els.macroHeight?.value ||
        els.macroBf?.value ||
        selectedMacroSex() ||
        els.macroActivityPicks?.querySelector(".choice-pick.active") ||
        els.macroStrategyPicks?.querySelector(".choice-pick.active");
      if (els.macroHint) setHint(els.macroHint, started ? result.error : "");
      return;
    }
    lastMacroResult = result;
    if (els.macroHint) setHint(els.macroHint, "");
    const typeLabel =
      result.goalType === "cut" ? "Cut" : result.goalType === "bulk" ? "Bulk" : "Maintain";
    const cur = result.current;
    const maint = result.maintenance;
    els.macroResults.hidden = false;
    els.macroResults.innerHTML = `
      <p class="macro-results-kicker">${typeLabel} · ${result.strategyName}</p>
      <h3>${cur.calories} kcal / day</h3>
      <div class="macro-macro-row">
        <div class="macro-macro"><span>Protein</span><strong>${cur.protein} g</strong></div>
        <div class="macro-macro"><span>Carbs</span><strong>${cur.carbs} g</strong></div>
        <div class="macro-macro"><span>Fat</span><strong>${cur.fat} g</strong></div>
      </div>
      <div class="macro-stat-grid">
        <div class="macro-stat"><span>BMR ${infoI("bmr")}</span><strong>${Math.round(result.bmr)} kcal</strong></div>
        <div class="macro-stat"><span>TDEE ${infoI("tdee")}</span><strong>${Math.round(result.tdee)} kcal</strong></div>
        <div class="macro-stat"><span>Lean mass ${infoI("lbm")}</span><strong>${Math.round(result.lbm)} lb</strong></div>
        <div class="macro-stat"><span>Activity burn ${infoI("activity-burn")}</span><strong>${Math.round(result.activityCals)} kcal</strong></div>
      </div>
      <p class="field-help">${result.strategyBlurb}</p>
      <p class="field-help">
        At goal weight, maintenance is about <strong>${maint.calories} kcal</strong>
        (${maint.protein} g protein, ${maint.carbs} g carbs, ${maint.fat} g fat).
      </p>
      <p class="field-help">
        Calories are a starting point. A window of about ±200 kcal is normal while you see how you respond.
      </p>
    `;
    if (els.macroApplyBtn) els.macroApplyBtn.disabled = false;
  }

  function applyMacroGoals() {
    const result = lastMacroResult || calculateMacros(readMacroInput());
    if (!result.ok) {
      setHint(els.macroHint, result.error);
      return;
    }
    const input = readMacroInput();
    const heightUnit = els.macroHeightUnit?.value === "cm" ? "cm" : "in";
    const weightUnit = els.macroWeightUnit?.value === "kg" ? "kg" : "lb";
    const goalUnit = els.macroGoalUnit?.value === "kg" ? "kg" : "lb";
    state.profile = sanitizeProfile({
      ...state.profile,
      age: input.age,
      sex: input.sex,
      heightIn: input.heightIn,
      heightUnit,
      bodyFat: input.bodyFat,
      activityPal: input.pal,
      strategy: input.strategy,
    });
    state.goalWeight = sanitizeGoalWeight({
      weight: els.macroGoal.value,
      unit: goalUnit,
    });
    try {
      upsertWeight(state, {
        weight: els.macroWeight.value,
        unit: weightUnit,
        date: todayKey(),
      });
    } catch {
      /* keep existing log if the field is somehow invalid after a successful calc */
    }
    const fiber = targets().fiber;
    state.goals = sanitizeGoals({
      calories: result.current.calories,
      protein: result.current.protein,
      fat: result.current.fat,
      carbs: result.current.carbs,
      fiber,
      maintenance: Math.round(result.tdee),
    });
    persist();
    renderAll();
    fillSettingsForm();
    setHint(
      els.macroHint,
      `Daily goals set to ${result.current.calories} kcal · ${result.current.protein} P / ${result.current.carbs} C / ${result.current.fat} F.`,
      true
    );
    showToast("Daily goals updated", true);
  }

  function selectedProfileSex() {
    const active = els.profileSexPicks?.querySelector(".sex-pick.active");
    return active?.getAttribute("data-profile-sex") || "";
  }

  function paintProfileForm() {
    const profile = sanitizeProfile(state?.profile);
    if (els.profileAge) els.profileAge.value = profile.age || "";
    els.profileSexPicks?.querySelectorAll("[data-profile-sex]").forEach((btn) => {
      const on = btn.getAttribute("data-profile-sex") === profile.sex;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
    setHint(els.profileHint, "");
  }

  function saveProfile() {
    const ageRaw = els.profileAge?.value;
    if (ageRaw && ageRaw.trim() && sanitizeProfile({ age: ageRaw }).age == null) {
      setHint(els.profileHint, "Enter an age between 1 and 120.");
      return;
    }
    state.profile = sanitizeProfile({
      ...state.profile,
      age: ageRaw,
      sex: selectedProfileSex(),
    });
    persist();
    paintProfileForm();
    paintMacroForm();
    setHint(els.profileHint, "Profile saved. The AI will use this on the next log.", true);
  }

  function hasLoggedWeight() {
    return Array.isArray(state?.weights) && state.weights.length > 0;
  }

  function remainingSetupSteps() {
    const profile = sanitizeProfile(state?.profile);
    if (profile.setupDone) return [];
    const steps = [];
    if (!profile.age) steps.push("age");
    if (!profile.sex) steps.push("sex");
    if (!hasLoggedWeight()) steps.push("weight");
    if (!sanitizeGoalWeight(state?.goalWeight)) steps.push("goal");
    return steps;
  }

  function closeProfileSetup() {
    setupQueue = [];
    setupIndex = 0;
    qaSexPick = "";
    if (els.qaStepBody) els.qaStepBody.innerHTML = "";
    if (els.qaStepHint) setHint(els.qaStepHint, "");
    if (els.profileOnboard) els.profileOnboard.hidden = true;
  }

  function setupWeightUnit() {
    return state?.weightUnit === "kg" ? "kg" : "lb";
  }

  function renderSetupStep() {
    const step = setupQueue[setupIndex];
    if (!step || !els.qaStepBody) return;
    const total = setupQueue.length;
    const n = setupIndex + 1;
    els.qaStepKicker.textContent = `${n} of ${total}`;
    if (els.qaStepHint) setHint(els.qaStepHint, "");
    const unit = setupWeightUnit();
    const skip = Boolean(els.qaSkipBtn);
    if (skip) {
      els.qaSkipBtn.hidden = step !== "goal";
    }
    if (els.qaNextBtn) {
      els.qaNextBtn.textContent = step === "goal" ? "Save goal" : "Continue";
    }

    if (step === "age") {
      els.qaStepTitle.textContent = "How old are you?";
      els.qaStepHelp.textContent =
        "A few quick details so calorie estimates fit you. Current age only — not a birth date.";
      els.qaStepBody.innerHTML = `
        <input type="number" id="qa-age" class="field-input" min="1" max="120" step="1" inputmode="numeric" placeholder="e.g. 42" aria-label="Age" />
      `;
    } else if (step === "sex") {
      qaSexPick = sanitizeProfile(state.profile).sex;
      els.qaStepTitle.textContent = "Male or female?";
      els.qaStepHelp.textContent = "Helps size calorie burn from activity.";
      els.qaStepBody.innerHTML = `
        <div class="sex-picks" role="radiogroup" aria-label="Sex">
          <button type="button" class="sex-pick${qaSexPick === "M" ? " active" : ""}" data-qa-sex="M" role="radio" aria-checked="${qaSexPick === "M" ? "true" : "false"}">M</button>
          <button type="button" class="sex-pick${qaSexPick === "F" ? " active" : ""}" data-qa-sex="F" role="radio" aria-checked="${qaSexPick === "F" ? "true" : "false"}">F</button>
        </div>
      `;
    } else if (step === "weight") {
      els.qaStepTitle.textContent = "What's your weight today?";
      els.qaStepHelp.textContent = "Starting point for burn estimates and your trend chart.";
      els.qaStepBody.innerHTML = `
        <div class="weight-row">
          <input type="number" id="qa-weight" class="field-input weight-input" inputmode="decimal" step="0.1" min="1" placeholder="${unit === "kg" ? "e.g. 81.2" : "e.g. 178.4"}" />
          <select id="qa-weight-unit" class="field-input weight-unit" aria-label="Weight unit">
            <option value="lb"${unit === "lb" ? " selected" : ""}>lb</option>
            <option value="kg"${unit === "kg" ? " selected" : ""}>kg</option>
          </select>
        </div>
      `;
    } else if (step === "goal") {
      els.qaStepTitle.textContent = "Want a goal weight?";
      els.qaStepHelp.textContent =
        "Optional. It shows as a dashed line on the trend. You can change this later on the Weight tab.";
      els.qaStepBody.innerHTML = `
        <div class="weight-row">
          <input type="number" id="qa-goal" class="field-input weight-input" inputmode="decimal" step="0.1" min="1" placeholder="${unit === "kg" ? "e.g. 75" : "e.g. 165"}" />
          <select id="qa-goal-unit" class="field-input weight-unit" aria-label="Goal weight unit">
            <option value="lb"${unit === "lb" ? " selected" : ""}>lb</option>
            <option value="kg"${unit === "kg" ? " selected" : ""}>kg</option>
          </select>
        </div>
      `;
    }

    const focusEl = els.qaStepBody.querySelector("input");
    if (focusEl) {
      setTimeout(() => focusEl.focus(), 50);
    }
  }

  function tourIsOpen() {
    return Boolean(els.appTour && !els.appTour.hidden);
  }

  function layoutTourStep() {
    if (!tourIsOpen() || !els.tourCard) return;
    const step = TOUR_STEPS[tourIndex];
    if (!step) return;
    const spot = els.tourSpot;
    const card = els.tourCard;
    const pad = 8;
    const gap = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = Math.min(vw - 32, 360);

    if (!step.target) {
      if (spot) spot.hidden = true;
      card.style.left = "";
      card.style.top = "";
      card.style.width = "";
      card.style.transform = "";
      return;
    }

    const target = document.querySelector(step.target);
    if (!target || target.hidden) {
      if (spot) spot.hidden = true;
      card.style.left = `${Math.max(16, (vw - cardW) / 2)}px`;
      card.style.width = `${cardW}px`;
      card.style.top = `${Math.max(16, vh * 0.55)}px`;
      card.style.transform = "none";
      return;
    }

    const r = target.getBoundingClientRect();
    if (spot) {
      spot.hidden = false;
      spot.style.top = `${Math.max(4, r.top - pad)}px`;
      spot.style.left = `${Math.max(4, r.left - pad)}px`;
      spot.style.width = `${Math.min(vw - 8, r.width + pad * 2)}px`;
      spot.style.height = `${r.height + pad * 2}px`;
    }

    card.style.width = `${cardW}px`;
    card.style.transform = "none";
    const left = Math.min(Math.max(16, r.left), vw - cardW - 16);
    card.style.left = `${left}px`;
    const cardH = card.offsetHeight || 180;
    const below = r.bottom + gap + cardH + 16 < vh;
    card.style.top = below
      ? `${r.bottom + gap}px`
      : `${Math.max(16, r.top - cardH - gap)}px`;
  }

  function paintTourStep() {
    const step = TOUR_STEPS[tourIndex];
    if (!step || !els.appTour) return;
    if (step.target) {
      setMode("nutrition");
      setView("today");
    }
    els.appTour.hidden = false;
    els.appTour.setAttribute("data-tour-step", step.id);
    if (els.tourKicker) els.tourKicker.textContent = `${tourIndex + 1} of ${TOUR_STEPS.length}`;
    if (els.tourTitle) els.tourTitle.textContent = step.title;
    if (els.tourBody) els.tourBody.textContent = step.body;
    if (els.tourNextBtn) {
      els.tourNextBtn.textContent = tourIndex === TOUR_STEPS.length - 1 ? "Got it" : "Next";
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(layoutTourStep);
    });
  }

  function closeTour(markDone) {
    if (els.appTour) {
      els.appTour.hidden = true;
      els.appTour.removeAttribute("data-tour-step");
    }
    if (els.tourSpot) els.tourSpot.hidden = true;
    tourIndex = 0;
    if (markDone && state) {
      state.profile = sanitizeProfile({ ...state.profile, tourDone: true });
      persist();
    }
  }

  function startTour() {
    if (!els.appTour) return;
    setMode("nutrition");
    setView("today");
    tourIndex = 0;
    paintTourStep();
  }

  function maybeStartTour(opts = {}) {
    if (!state || !session) return;
    if (els.appShell?.hidden) return;
    if (els.profileOnboard && !els.profileOnboard.hidden) return;
    const profile = sanitizeProfile(state.profile);
    if (profile.tourDone) return;
    if (tourIsOpen()) return;
    if (stateHasLogs(state) || (profile.setupDone && !opts.afterSetup)) {
      state.profile = sanitizeProfile({ ...profile, tourDone: true });
      persist();
      return;
    }
    startTour();
  }

  function advanceTour() {
    if (tourIndex >= TOUR_STEPS.length - 1) {
      closeTour(true);
      showToast("You're set. Type a meal to start.", true);
      els.logInput?.focus();
      return;
    }
    tourIndex += 1;
    paintTourStep();
  }

  function finishProfileSetup() {
    state.profile = sanitizeProfile({ ...state.profile, setupDone: true });
    persist();
    paintProfileForm();
    renderAll();
    closeProfileSetup();
    maybeStartTour({ afterSetup: true });
  }

  function advanceSetup() {
    setupIndex += 1;
    if (setupIndex >= setupQueue.length) {
      finishProfileSetup();
      return;
    }
    renderSetupStep();
  }

  function submitSetupStep() {
    const step = setupQueue[setupIndex];
    if (!step) return;
    if (els.qaStepHint) setHint(els.qaStepHint, "");

    if (step === "age") {
      const age = sanitizeProfile({ age: document.getElementById("qa-age")?.value }).age;
      if (!age) {
        setHint(els.qaStepHint, "Enter an age between 1 and 120.");
        return;
      }
      state.profile = sanitizeProfile({ ...state.profile, age });
      persist();
      paintProfileForm();
      advanceSetup();
      return;
    }

    if (step === "sex") {
      const sex = sanitizeProfile({ sex: qaSexPick }).sex;
      if (!sex) {
        setHint(els.qaStepHint, "Pick M or F.");
        return;
      }
      state.profile = sanitizeProfile({ ...state.profile, sex });
      persist();
      paintProfileForm();
      advanceSetup();
      return;
    }

    if (step === "weight") {
      const raw = document.getElementById("qa-weight")?.value.trim();
      const unit = document.getElementById("qa-weight-unit")?.value || setupWeightUnit();
      if (!raw) {
        setHint(els.qaStepHint, "Enter your current weight.");
        return;
      }
      try {
        upsertWeight(state, { weight: raw, unit, date: todayKey() });
        persist();
        renderAll();
        advanceSetup();
      } catch (err) {
        setHint(els.qaStepHint, err.message || "Enter a valid weight.");
      }
      return;
    }

    if (step === "goal") {
      const raw = document.getElementById("qa-goal")?.value.trim();
      if (!raw) {
        setHint(els.qaStepHint, "Enter a goal, or skip for now.");
        return;
      }
      const next = sanitizeGoalWeight({
        weight: raw,
        unit: document.getElementById("qa-goal-unit")?.value || setupWeightUnit(),
      });
      if (!next) {
        setHint(els.qaStepHint, "Enter a valid goal weight.");
        return;
      }
      state.goalWeight = next;
      persist();
      renderAll();
      finishProfileSetup();
    }
  }

  function skipSetupStep() {
    if (setupQueue[setupIndex] !== "goal") return;
    finishProfileSetup();
  }

  function maybeStartProfileSetup() {
    if (!state || !session) return;
    if (els.appShell?.hidden) return;
    const remaining = remainingSetupSteps();
    if (!remaining.length) {
      const profile = sanitizeProfile(state.profile);
      if (!profile.setupDone) {
        state.profile = sanitizeProfile({ ...profile, setupDone: true });
        persist();
      }
      closeProfileSetup();
      maybeStartTour();
      return;
    }
    const showing = els.profileOnboard && !els.profileOnboard.hidden;
    if (showing) {
      const leftover = setupQueue.slice(setupIndex);
      if (leftover.join() === remaining.join()) return;
      setupQueue = remaining;
      setupIndex = 0;
      renderSetupStep();
      return;
    }
    setupQueue = remaining;
    setupIndex = 0;
    renderSetupStep();
    els.profileOnboard.hidden = false;
  }

  function handleGoalWeightSave() {
    const raw = els.goalWeightInput?.value.trim();
    if (!raw) {
      state.goalWeight = null;
      persist();
      renderWeight();
      setHint(els.goalWeightHint, "Goal weight cleared.", true);
      return;
    }
    const next = sanitizeGoalWeight({
      weight: raw,
      unit: els.goalWeightUnit?.value || state.weightUnit || "lb",
    });
    if (!next) {
      setHint(els.goalWeightHint, "Enter a valid goal weight.");
      return;
    }
    state.goalWeight = next;
    persist();
    renderWeight();
    setHint(els.goalWeightHint, `Goal set to ${next.weight} ${next.unit}.`, true);
    showToast(`Goal ${next.weight} ${next.unit}`, true);
  }

  function wireAppEvents() {
    document.querySelectorAll(".mode-tabs .mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => setMode(tab.dataset.mode));
    });

    document.querySelectorAll(".view-tabs .tab").forEach((tab) => {
      tab.addEventListener("click", () => setView(tab.dataset.view));
    });

    els.settingsBtn?.addEventListener("click", () => setMode("settings"));
    els.themeSwatches?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-theme-id]");
      if (!btn || !els.themeSwatches.contains(btn)) return;
      applyTheme(btn.getAttribute("data-theme-id"), true);
    });
    els.logJumpBtn?.addEventListener("click", () => {
      if (currentMode !== "nutrition" && currentMode !== "activity") {
        setMode("nutrition");
      }
      if (currentMode === "nutrition") setView("today");
      updateLogVisibility();
      syncLogPanel();
      renderQuickActions();
      els.logPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
      els.logInput.focus();
    });

    document.querySelectorAll("[data-qa-type]").forEach((tab) => {
      tab.addEventListener("click", () => {
        if (qaEditType === tab.dataset.qaType) return;
        state.quickActions = readQaEditorDraft();
        persist();
        qaEditType = tab.dataset.qaType;
        setHint(els.qaHint, "");
        renderQaEditor();
      });
    });

    document.querySelectorAll("[data-settings-section]").forEach((tab) => {
      tab.addEventListener("click", () => {
        if (settingsSection === "quick") {
          state.quickActions = readQaEditorDraft();
          persist();
        }
        setSettingsSection(tab.dataset.settingsSection);
      });
    });

    els.qaEditor?.addEventListener("click", (e) => {
      const createBtn = e.target.closest("[data-qa-create]");
      if (createBtn) {
        createQuickAction(Number(createBtn.getAttribute("data-qa-create")));
        return;
      }
      const clearBtn = e.target.closest("[data-qa-clear]");
      if (clearBtn) {
        clearQuickAction(Number(clearBtn.getAttribute("data-qa-clear")));
      }
    });

    els.quickActions?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-qa-id]");
      if (!btn || btn.disabled) return;
      const id = btn.getAttribute("data-qa-id");
      const action = activeQuickActions().find((a) => a.id === id);
      if (!action) return;
      logQuickAction(action);
    });

    els.logBtn.addEventListener("click", () => handleLog());
    els.micBtn?.addEventListener("click", () => toggleSpeech());
    if (els.micBtn && !speechEngine()) els.micBtn.hidden = true;
    els.logInput.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleLog();
      }
    });

    els.mealList.addEventListener("click", (e) => {
      const saveBtn = e.target.closest("[data-qa-from-meal]");
      if (saveBtn) {
        saveEntryAsQuickAction("nutrition", saveBtn.getAttribute("data-qa-from-meal"));
        return;
      }
      const editBtn = e.target.closest("[data-edit-meal]");
      if (editBtn) {
        openEditMeal(editBtn.getAttribute("data-edit-meal"));
        return;
      }
      const btn = e.target.closest("[data-delete-meal]");
      if (!btn) return;
      deleteMeal(btn.getAttribute("data-delete-meal"));
    });

    els.activityList.addEventListener("click", (e) => {
      const saveBtn = e.target.closest("[data-qa-from-activity]");
      if (saveBtn) {
        saveEntryAsQuickAction("activity", saveBtn.getAttribute("data-qa-from-activity"));
        return;
      }
      const editBtn = e.target.closest("[data-edit-activity]");
      if (editBtn) {
        openEditActivity(editBtn.getAttribute("data-edit-activity"));
        return;
      }
      const btn = e.target.closest("[data-delete-activity]");
      if (!btn) return;
      deleteActivity(btn.getAttribute("data-delete-activity"));
    });

    els.weightBtn.addEventListener("click", handleWeightLog);
    els.weightInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleWeightLog();
      }
    });
    els.goalWeightBtn?.addEventListener("click", handleGoalWeightSave);
    els.goalWeightInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleGoalWeightSave();
      }
    });
    els.weightList.addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit-weight]");
      if (editBtn) {
        openEditWeight(editBtn.getAttribute("data-edit-weight"));
        return;
      }
      const btn = e.target.closest("[data-delete-weight]");
      if (!btn) return;
      deleteWeight(btn.getAttribute("data-delete-weight"));
    });

    els.resetDayBtn.addEventListener("click", resetDay);
    els.logoutBtn.addEventListener("click", handleSignOut);
    els.settingsLogoutBtn.addEventListener("click", handleSignOut);
    els.saveGoalsBtn.addEventListener("click", saveGoals);
    els.macroApplyBtn?.addEventListener("click", applyMacroGoals);
    ["macroWeight", "macroGoal", "macroHeight", "macroBf", "macroAge"].forEach((key) => {
      els[key]?.addEventListener("input", refreshMacroCalc);
    });
    const convertPair = (inputEl, unitEl, kind) => {
      let prev = unitEl?.value;
      unitEl?.addEventListener("change", () => {
        const next = unitEl.value;
        const raw = Number(inputEl?.value);
        if (Number.isFinite(raw) && raw > 0 && prev && prev !== next) {
          if (kind === "height") {
            const inches = prev === "cm" ? raw / 2.54 : raw;
            inputEl.value = next === "cm" ? round1(inches * 2.54) : round1(inches);
          } else {
            const converted = convertWeight(raw, prev, next);
            if (converted != null) inputEl.value = converted;
          }
        }
        prev = next;
        refreshMacroCalc();
      });
    };
    convertPair(els.macroWeight, els.macroWeightUnit, "weight");
    convertPair(els.macroGoal, els.macroGoalUnit, "weight");
    convertPair(els.macroHeight, els.macroHeightUnit, "height");
    els.macroSexPicks?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-macro-sex]");
      if (!btn) return;
      paintChoiceGroup(els.macroSexPicks, "data-macro-sex", btn.getAttribute("data-macro-sex"));
      refreshMacroCalc();
    });
    els.macroActivityPicks?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-macro-pal]");
      if (!btn) return;
      paintChoiceGroup(els.macroActivityPicks, "data-macro-pal", btn.getAttribute("data-macro-pal"));
      refreshMacroCalc();
    });
    els.macroStrategyPicks?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-macro-strategy]");
      if (!btn) return;
      paintChoiceGroup(els.macroStrategyPicks, "data-macro-strategy", btn.getAttribute("data-macro-strategy"));
      refreshMacroCalc();
    });
    els.saveProfileBtn?.addEventListener("click", saveProfile);
    els.profileSexPicks?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-profile-sex]");
      if (!btn) return;
      const already = btn.classList.contains("active");
      els.profileSexPicks.querySelectorAll("[data-profile-sex]").forEach((el) => {
        const on = !already && el === btn;
        el.classList.toggle("active", on);
        el.setAttribute("aria-checked", on ? "true" : "false");
      });
    });
    els.qaNextBtn?.addEventListener("click", submitSetupStep);
    els.qaSkipBtn?.addEventListener("click", skipSetupStep);
    els.qaStepBody?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-qa-sex]");
      if (!btn || !els.qaStepBody.contains(btn)) return;
      qaSexPick = btn.getAttribute("data-qa-sex") || "";
      els.qaStepBody.querySelectorAll("[data-qa-sex]").forEach((el) => {
        const on = el === btn;
        el.classList.toggle("active", on);
        el.setAttribute("aria-checked", on ? "true" : "false");
      });
    });
    els.qaStepBody?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (e.target.closest("textarea")) return;
      e.preventDefault();
      submitSetupStep();
    });
    els.driveSyncBtn?.addEventListener("click", handleDriveSyncNow);

    els.editClose.addEventListener("click", closeEditModal);
    els.editSave.addEventListener("click", saveEdit);
    els.editReparse.addEventListener("click", reparseEdit);
    els.editModal.addEventListener("click", (e) => {
      if (e.target === els.editModal) closeEditModal();
    });
    els.qaSlotCancel?.addEventListener("click", closeQaSlotModal);
    els.qaSlotModal?.addEventListener("click", (e) => {
      if (e.target === els.qaSlotModal) closeQaSlotModal();
    });
    els.qaSlotSave?.addEventListener("click", saveNamedQuickAction);
    els.qaSlotName?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveNamedQuickAction();
      }
    });
    els.qaSlotChoices?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-qa-replace]");
      if (!btn || !pendingQaSave) return;
      const action = namedPendingAction();
      if (!action) return;
      commitQuickActionSlot(
        pendingQaSave.type,
        Number(btn.getAttribute("data-qa-replace")),
        action
      );
    });
    els.tourSkipBtn?.addEventListener("click", () => closeTour(true));
    els.tourNextBtn?.addEventListener("click", advanceTour);
    document.addEventListener(
      "click",
      (e) => {
      const more = e.target.closest("[data-open-glossary]");
      if (more) {
        e.preventDefault();
        e.stopPropagation();
        goToGlossary(more.getAttribute("data-open-glossary") || els.glossaryTip?.getAttribute("data-glossary-id"));
        return;
      }
      const info = e.target.closest("[data-glossary]");
      if (info) {
        e.preventDefault();
        e.stopPropagation();
        if (
          !els.glossaryTip?.hidden &&
          els.glossaryTip.getAttribute("data-glossary-id") === info.getAttribute("data-glossary")
        ) {
          closeGlossaryTip();
          return;
        }
        openGlossaryTip(info);
        return;
      }
      if (els.glossaryTip && !els.glossaryTip.hidden && !e.target.closest("#glossary-tip")) {
        closeGlossaryTip();
      }
      },
      true
    );
    window.addEventListener("resize", () => {
      updateLogJump();
      if (tourIsOpen()) layoutTourStep();
      if (els.glossaryTip && !els.glossaryTip.hidden) {
        const id = els.glossaryTip.getAttribute("data-glossary-id");
        const btn = document.querySelector(`[data-glossary="${id}"]`);
        if (btn) positionGlossaryTip(btn);
      }
    });
    window.addEventListener(
      "scroll",
      () => {
        updateLogJump();
        if (els.toast && !els.toast.hidden) positionToast();
      },
      { passive: true }
    );
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        window.MMC.flushDrivePush?.(true);
        return;
      }
      if (session?.provider === "google" && Date.now() - lastDrivePullAt > 8000) {
        syncFromDrive({ quiet: true });
      }
    });
    window.addEventListener("focus", () => {
      if (session?.provider === "google" && Date.now() - lastDrivePullAt > 8000) {
        syncFromDrive({ quiet: true });
      }
    });
    window.addEventListener("online", () => {
      if (session?.provider === "google") syncFromDrive({ quiet: true });
    });
    window.addEventListener("pagehide", () => {
      window.MMC.flushDrivePush?.(true);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (els.glossaryTip && !els.glossaryTip.hidden) {
        closeGlossaryTip();
        return;
      }
      if (els.profileOnboard && !els.profileOnboard.hidden) return;
      if (tourIsOpen()) {
        closeTour(true);
        return;
      }
      if (els.qaSlotModal && !els.qaSlotModal.hidden) {
        closeQaSlotModal();
        return;
      }
      if (!els.editModal.hidden) closeEditModal();
    });
  }

  els.googleSignInBtn?.addEventListener("click", handleGoogleSignIn);

  // Boot
  const existing = getSession();
  if (existing?.provider === "google") {
    enterApp(existing);
    syncFromDrive();
  } else {
    showAuth();
  }
})();
