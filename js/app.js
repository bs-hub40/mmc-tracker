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
    getStreak,
    getBestStreak,
    trendSeries,
    avg,
    uid,
    upsertWeight,
    weightStats,
    formatWeightDate,
    getSession,
    hasAccounts,
    createAccount,
    login,
    loginWithGoogle,
    logout,
    parseMealWithGrok,
    parseActivityWithGrok,
    AI_PROVIDERS,
    getActiveApiKey,
    setActiveApiKey,
    normalizeProvider,
    normalizeModel,
    migrateAiSettings,
    sanitizeQuickActions,
    getGoogleClientId,
    setGoogleClientId,
    googleSignIn,
    googleRestoreToken,
    googleSignOut,
    googleSyncStatus,
    drivePull,
    drivePush,
    scheduleDrivePush,
    flushDrivePush,
    mergeDriveState,
  } = window.MMC;

  const LOG_COPY = {
    nutrition: {
      label: "Log food with AI",
      placeholder:
        'e.g. "Coffee with 1 tbsp maple syrup, 4 oz cooked skirt steak, 1 slice mozzarella"',
      button: "Parse & Log",
      busy: "Parsing…",
    },
    activity: {
      label: "Log exercise with AI",
      placeholder: 'e.g. "45 min brisk walk" or "Upper body lift, 50 min, moderate"',
      button: "Analyze & Log",
      busy: "Analyzing…",
    },
  };

  let state = null;
  let session = null;
  let currentMode = "nutrition";
  let currentView = "today";
  let authTab = "login";
  let appReady = false;
  let qaEditType = "nutrition";

  const els = {
    authScreen: document.getElementById("auth-screen"),
    appShell: document.getElementById("app-shell"),
    authForm: document.getElementById("auth-form"),
    authUsername: document.getElementById("auth-username"),
    authPassword: document.getElementById("auth-password"),
    authSubmit: document.getElementById("auth-submit"),
    authError: document.getElementById("auth-error"),
    authHelp: document.getElementById("auth-help"),
    googleSignInBtn: document.getElementById("google-signin-btn"),
    googleAuthHelp: document.getElementById("google-auth-help"),
    authGoogleClientId: document.getElementById("auth-google-client-id"),
    authSaveGoogleClient: document.getElementById("auth-save-google-client"),
    macros: document.getElementById("macros"),
    energyCard: document.getElementById("energy-card"),
    dailyTracker: document.getElementById("daily-tracker"),
    logLabel: document.getElementById("log-label"),
    logInput: document.getElementById("log-input"),
    logBtn: document.getElementById("log-btn"),
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
    aiSetup: document.getElementById("ai-setup"),
    onboardProviders: document.getElementById("onboard-providers"),
    onboardKeyLink: document.getElementById("onboard-key-link"),
    onboardKeyHelp: document.getElementById("onboard-key-help"),
    onboardApiKey: document.getElementById("onboard-api-key"),
    onboardSaveBtn: document.getElementById("onboard-save-btn"),
    onboardHint: document.getElementById("onboard-hint"),
    toast: document.getElementById("toast"),
    weightInput: document.getElementById("weight-input"),
    weightUnit: document.getElementById("weight-unit"),
    weightBtn: document.getElementById("weight-btn"),
    weightHint: document.getElementById("weight-hint"),
    weightDateLabel: document.getElementById("weight-date-label"),
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
    saveGoalsBtn: document.getElementById("save-goals-btn"),
    goalsHint: document.getElementById("goals-hint"),
    apiKey: document.getElementById("api-key"),
    apiKeyHelp: document.getElementById("api-key-help"),
    providerSelect: document.getElementById("provider-select"),
    modelSelect: document.getElementById("model-select"),
    saveApiBtn: document.getElementById("save-api-btn"),
    apiHint: document.getElementById("api-hint"),
    settingsKeyLink: document.getElementById("settings-key-link"),
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
    googleClientId: document.getElementById("google-client-id"),
    saveGoogleClientBtn: document.getElementById("save-google-client-btn"),
    googleClientHint: document.getElementById("google-client-hint"),
    settingsLogoutBtn: document.getElementById("settings-logout-btn"),
    editModal: document.getElementById("edit-modal"),
    editTitle: document.getElementById("edit-title"),
    editBody: document.getElementById("edit-body"),
    editClose: document.getElementById("edit-close"),
    editReparse: document.getElementById("edit-reparse"),
    editSave: document.getElementById("edit-save"),
    editHint: document.getElementById("edit-hint"),
  };

  let editTarget = null;
  let toastTimer = null;
  let logBusy = false;
  let onboardProvider = "xai";

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
    state = ensureToday(state);
    state.updatedAt = Date.now();
    saveState(state);
    if (session?.provider === "google") {
      scheduleDrivePush(state);
      flushDrivePush();
      renderDriveStatus();
    }
  }

  function setHint(el, message, ok = false) {
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.classList.toggle("ok", ok);
  }

  function showToast(message, ok = true) {
    if (!els.toast || !message) return;
    els.toast.hidden = false;
    els.toast.textContent = message;
    els.toast.classList.toggle("ok", ok);
    els.toast.classList.toggle("err", !ok);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 2800);
  }

  function hasAiKey() {
    return Boolean(getActiveApiKey(state)?.trim());
  }

  function syncAiGate() {
    if (!els.aiSetup) return;
    const ready = hasAiKey();
    els.aiSetup.hidden = ready;
    if (els.logCompose) els.logCompose.hidden = !ready;
    if (currentMode === "nutrition" || currentMode === "activity") {
      els.logBtn.disabled = logBusy || !ready;
      els.logInput.disabled = logBusy || !ready;
      els.quickActions?.querySelectorAll(".quick-action-btn").forEach((btn) => {
        btn.disabled = logBusy || !ready;
      });
    }
    if (!ready) renderOnboard();
  }

  function renderOnboard() {
    if (!els.onboardProviders || !state) return;
    onboardProvider = normalizeProvider(onboardProvider || state.provider || "xai");
    els.onboardProviders.innerHTML = Object.values(AI_PROVIDERS)
      .map((p) => {
        const rec = p.id === "xai" ? " · easy start" : "";
        const active = p.id === onboardProvider ? " active" : "";
        return `<button type="button" class="provider-pick${active}" data-onboard-provider="${p.id}" role="radio" aria-checked="${p.id === onboardProvider}">${p.label}${rec}</button>`;
      })
      .join("");
    syncOnboardProviderUi();
  }

  function syncOnboardProviderUi() {
    const cfg = AI_PROVIDERS[normalizeProvider(onboardProvider)];
    if (!cfg) return;
    if (els.onboardKeyLink) {
      els.onboardKeyLink.href = cfg.keyUrl;
      els.onboardKeyLink.textContent = `Open ${cfg.label} key page`;
    }
    if (els.onboardKeyHelp) {
      els.onboardKeyHelp.innerHTML = `Create an API key at <strong>${cfg.keyUrlLabel}</strong>. ${cfg.keyHint}. You may need to add a little prepaid credit.`;
    }
    if (els.onboardApiKey) els.onboardApiKey.placeholder = cfg.keyHint;
  }

  function saveOnboardApi() {
    const provider = normalizeProvider(onboardProvider);
    const cfg = AI_PROVIDERS[provider];
    const key = (els.onboardApiKey?.value || "").trim();
    if (!key) {
      setHint(els.onboardHint, "Paste your API key first.");
      return;
    }
    if (cfg.keyPrefix && !key.startsWith(cfg.keyPrefix)) {
      setHint(els.onboardHint, `That doesn’t look like a ${cfg.label} key. ${cfg.keyHint}.`);
      return;
    }
    state.provider = provider;
    state.model = normalizeModel(cfg.defaultModel, provider);
    setActiveApiKey(state, key);
    persist();
    if (els.onboardApiKey) els.onboardApiKey.value = "";
    fillSettingsForm();
    syncAiGate();
    renderQuickActions();
    showToast(`${cfg.label} connected. You can log now.`, true);
    els.logInput?.focus();
  }

  function setBusy(busy) {
    if (currentMode === "weight" || currentMode === "settings") return;
    logBusy = busy;
    const copy = LOG_COPY[currentMode];
    const ready = hasAiKey();
    els.logBtn.disabled = busy || !ready;
    els.logInput.disabled = busy || !ready;
    const spinner = els.logBtn.querySelector(".btn-spinner");
    const text = els.logBtn.querySelector(".btn-text");
    spinner.hidden = !busy;
    text.textContent = busy ? copy.busy : copy.button;
    if (els.quickActions) {
      els.quickActions.querySelectorAll(".quick-action-btn").forEach((btn) => {
        btn.disabled = busy || !ready;
      });
    }
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
    syncAuthTab();
    syncGoogleAuthUi();
  }

  function enterApp(nextSession) {
    session = nextSession;
    state = ensureToday(loadState());
    Object.assign(state, migrateAiSettings(state));
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
  }

  function handleSignOut() {
    googleSignOut();
    logout();
    session = null;
    state = null;
    showAuth();
    els.authPassword.value = "";
  }

  function syncGoogleAuthUi() {
    const clientId = getGoogleClientId();
    if (els.authGoogleClientId) els.authGoogleClientId.value = clientId;
    if (els.googleSignInBtn) els.googleSignInBtn.disabled = !clientId;
    if (els.googleAuthHelp) {
      els.googleAuthHelp.textContent = clientId
        ? "Uses your Google account. Tracker data syncs to an MMC Tracker folder in your Drive."
        : "Open Google setup below (or Settings) and paste a Google OAuth Client ID first.";
    }
  }

  function syncAuthTab() {
    document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.authTab === authTab);
    });
    const creating = authTab === "create";
    els.authSubmit.querySelector(".btn-text").textContent = creating
      ? "Create account"
      : "Sign in";
    els.authPassword.autocomplete = creating ? "new-password" : "current-password";
    els.authHelp.textContent = creating
      ? hasAccounts()
        ? "Create another local account on this device. No email required."
        : "Create your account. Existing local data (if any) will be attached to this first account."
      : "Sign in to your local account on this device.";
    setHint(els.authError, "");
  }

  function syncLogPanel() {
    if (currentMode !== "nutrition" && currentMode !== "activity") return;
    const copy = LOG_COPY[currentMode];
    els.logLabel.textContent = copy.label;
    els.logInput.placeholder = copy.placeholder;
    if (!logBusy) els.logBtn.querySelector(".btn-text").textContent = copy.button;
    syncAiGate();
  }

  function updateLogVisibility() {
    const showFullLog =
      (currentMode === "nutrition" && currentView === "today") ||
      currentMode === "activity";
    const showJump =
      currentMode === "nutrition" && currentView !== "today";

    els.logPanel.hidden = !showFullLog;
    if (els.logJumpBtn) els.logJumpBtn.hidden = !showJump;
  }

  function setMode(mode) {
    currentMode = mode;
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

    // Daily tracker stays put on every tab except Settings
    els.dailyTracker.hidden = mode === "settings";
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
    if (mode === "settings") fillSettingsForm();
    if (mode === "nutrition" && currentView !== "today") renderTrends();
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

  function fillProviderSelect() {
    els.providerSelect.innerHTML = Object.values(AI_PROVIDERS)
      .map(
        (p) =>
          `<option value="${p.id}">${p.label}</option>`
      )
      .join("");
  }

  function fillModelSelect(providerId, selectedModel) {
    const cfg = AI_PROVIDERS[normalizeProvider(providerId)];
    els.modelSelect.innerHTML = cfg.models
      .map(
        (m) =>
          `<option value="${m.id}">${m.label}</option>`
      )
      .join("");
    els.modelSelect.value = normalizeModel(selectedModel, cfg.id);
  }

  function syncApiKeyField() {
    const provider = normalizeProvider(els.providerSelect.value);
    const cfg = AI_PROVIDERS[provider];
    els.apiKey.placeholder = cfg.keyHint;
    els.apiKeyHelp.innerHTML = `For <strong>${cfg.label}</strong>. ${cfg.keyHint}. Stored only on this device.`;
    if (els.settingsKeyLink) {
      els.settingsKeyLink.href = cfg.keyUrl;
      els.settingsKeyLink.textContent = `Get a ${cfg.label} API key`;
    }
    const keys = state.apiKeys || {};
    els.apiKey.value = keys[provider] || (provider === "xai" ? state.apiKey || "" : "");
  }

  function onProviderChange() {
    const provider = normalizeProvider(els.providerSelect.value);
    const cfg = AI_PROVIDERS[provider];
    fillModelSelect(provider, state.provider === provider ? state.model : cfg.defaultModel);
    syncApiKeyField();
  }

  function fillSettingsForm() {
    const t = targets();
    els.goalCalories.value = t.calories;
    els.goalProtein.value = t.protein;
    els.goalFat.value = t.fat;
    els.goalCarbs.value = t.carbs;
    els.goalFiber.value = t.fiber;
    Object.assign(state, migrateAiSettings(state));
    state.quickActions = sanitizeQuickActions(state.quickActions);
    els.providerSelect.value = state.provider;
    fillModelSelect(state.provider, state.model);
    syncApiKeyField();
    els.settingsUsername.textContent = session?.username || "—";
    if (els.accountHelp) {
      els.accountHelp.textContent =
        session?.provider === "google"
          ? "Signed in with Google. Your log syncs to an MMC Tracker folder in this Google Drive."
          : "Local account on this browser. Sign in with Google to sync across phone and desktop.";
    }
    if (els.googleClientId) els.googleClientId.value = getGoogleClientId();
    setHint(els.goalsHint, "");
    setHint(els.apiHint, "");
    setHint(els.qaHint, "");
    setHint(els.googleClientHint, "");
    setHint(els.driveSyncHint, "");
    renderQaEditor();
    renderDriveStatus();
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
            `<a href="${status.folderUrl}" target="_blank" rel="noopener noreferrer">Open MMC Tracker folder</a>`
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
      els.driveSyncStatus.textContent = "Drive: reconnect this session to sync";
      return;
    }
    els.driveSyncStatus.textContent = status.lastSyncAt
      ? `Drive: synced ${new Date(status.lastSyncAt).toLocaleTimeString()}`
      : "Drive: connected";
  }

  async function syncFromDrive() {
    if (session?.provider !== "google") return;
    const restored = await googleRestoreToken();
    if (!restored) {
      renderDriveStatus();
      return;
    }
    try {
      const remote = await drivePull();
      if (!remote) {
        await drivePush(state);
        renderDriveStatus();
        return;
      }

      const localTs = Number(state.updatedAt) || 0;
      const remoteTs = Number(remote.updatedAt) || 0;
      if (remoteTs >= localTs) {
        state = remote;
        saveState(state);
        renderAll();
      } else {
        state = mergeDriveState(state, remote);
        saveState(state);
        renderAll();
        await drivePush(state);
      }
      renderDriveStatus();
    } catch (err) {
      setHint(els.driveSyncHint, err.message || "Drive sync failed.");
      renderDriveStatus();
    }
  }

  async function handleGoogleSignIn() {
    setHint(els.authError, "");
    if (!getGoogleClientId()) {
      setHint(els.authError, "Add a Google Client ID in Settings first.");
      return;
    }
    if (els.googleSignInBtn) els.googleSignInBtn.disabled = true;
    try {
      const profile = await googleSignIn();
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
      const ok = await googleRestoreToken();
      if (!ok) {
        await googleSignIn();
      }
      await syncFromDrive();
      setHint(els.driveSyncHint, "Pulled latest from Google Drive.", true);
    } catch (err) {
      setHint(els.driveSyncHint, err.message || "Drive sync failed.");
    } finally {
      els.driveSyncBtn.disabled = false;
    }
  }

  function saveGoogleClient() {
    const value = els.googleClientId.value.trim();
    setGoogleClientId(value);
    syncGoogleAuthUi();
    setHint(
      els.googleClientHint,
      value ? "Google Client ID saved on this device." : "Google Client ID cleared.",
      true
    );
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
      .map(
        (slot, i) => `
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
        />
        <label class="field-label" for="qa-prompt-${i}">AI prompt</label>
        <textarea
          id="qa-prompt-${i}"
          class="field-input"
          maxlength="500"
          rows="3"
          placeholder="${
            qaEditType === "nutrition"
              ? 'e.g. 3 eggs scrambled in butter, 1 cup orange juice'
              : 'e.g. 45 min brisk walk'
          }"
          data-qa-field="prompt"
        >${escapeHtml(slot.prompt)}</textarea>
        <p class="field-help">Leave blank to hide this slot. Prompt is sent to AI when you tap the button on the ${kind} tab.</p>
      </div>
    `
      )
      .join("");
  }

  function readQaEditor() {
    const next = sanitizeQuickActions(state.quickActions);
    const slots = [0, 1, 2].map((i) => {
      const root = els.qaEditor.querySelector(`[data-qa-index="${i}"]`);
      const existing = next[qaEditType][i] || {};
      return {
        id: existing.id || uid(),
        label: root?.querySelector('[data-qa-field="label"]')?.value || "",
        prompt: root?.querySelector('[data-qa-field="prompt"]')?.value || "",
      };
    });
    next[qaEditType] = slots;
    return sanitizeQuickActions(next);
  }

  function saveQuickActions() {
    state.quickActions = readQaEditor();
    persist();
    renderQuickActions();
    renderQaEditor();
    setHint(els.qaHint, "Quick actions saved.", true);
    showToast("Quick actions saved", true);
  }

  function activeQuickActions() {
    const qa = sanitizeQuickActions(state?.quickActions);
    const list = currentMode === "activity" ? qa.activity : qa.nutrition;
    return list.filter((item) => item.label && item.prompt);
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

    const ready = hasAiKey();
    els.quickActions.hidden = false;
    els.quickActions.innerHTML = actions
      .map(
        (action) => `
      <button
        type="button"
        class="quick-action-btn"
        data-qa-id="${escapeHtml(action.id)}"
        ${logBusy || !ready ? "disabled" : ""}
        title="${escapeHtml(action.prompt)}"
      >${escapeHtml(action.label)}</button>
    `
      )
      .join("");
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

  function renderEnergy() {
    const energy = dayEnergy(today(), state);
    const t = energy.targets;
    const remaining = energy.remaining;
    let remClass = "";
    if (remaining < 0) remClass = "over";
    else if (Math.abs(remaining) <= t.calories * 0.1) remClass = "on-track";

    const amount = round1(Math.abs(remaining));
    const status = remaining >= 0 ? "left today" : "over goal";

    els.energyCard.innerHTML = `
      <div class="energy-hero">
        <div class="energy-hero-copy">
          <div class="energy-hero-value ${remClass}">${amount}</div>
          <div class="energy-hero-label">${status}</div>
        </div>
        <div class="energy-hero-meta">Goal ${t.calories} kcal</div>
      </div>
      <div class="energy-strip">
        <span>Food<strong>${round1(energy.food.calories)}</strong></span>
        <span class="burn">Burned<strong>${round1(energy.burned)}</strong></span>
        <span>Net<strong>${round1(energy.netCalories)}</strong></span>
      </div>
    `;
  }

  function renderMacros() {
    const energy = dayEnergy(today(), state);
    const totals = energy.food;

    els.macros.innerHTML = macroMeta()
      .map((meta) => {
        const value = totals[meta.key];
        const pct = Math.min(100, (value / meta.target) * 100);
        let rowClass = "macro-row";
        let fillClass = `macro-fill ${meta.key}`;

        if (meta.key === "fat") {
          const ratio = value / meta.target;
          if (ratio >= 1) {
            rowClass += " fat-over";
            fillClass += " over";
          } else if (ratio >= 0.85) {
            rowClass += " fat-warn";
            fillClass += " warn";
          }
        }

        const targetLabel =
          meta.mode === "minimum"
            ? `>${meta.target}`
            : meta.mode === "ceiling"
              ? `≤${meta.target}`
              : String(meta.target);

        return `
          <div class="${rowClass}">
            <div class="macro-name">${meta.label}</div>
            <div class="macro-track" aria-hidden="true">
              <div class="${fillClass}" style="width:${pct}%"></div>
            </div>
            <div class="macro-values">${round1(value)} <span>/ ${targetLabel} ${meta.unit}</span></div>
          </div>
        `;
      })
      .join("");
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
      .map((meal, index) => {
        const names = (meal.items || [])
          .map((item) => escapeHtml(item.name))
          .join(", ");

        return `
          <li class="meal-item${index === 0 ? " is-new" : ""}">
            <div class="meal-top">
              <div>
                <div class="meal-time">${formatTime(meal.loggedAt)}</div>
                <div class="activity-name">${names || "Meal"}</div>
              </div>
              <div class="entry-actions">
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

  function renderActivities() {
    const activities = today().activities;
    els.activityEmpty.hidden = activities.length > 0;
    els.activityList.innerHTML = [...activities]
      .reverse()
      .map((act) => {
        const items = Array.isArray(act.items) ? act.items : [];
        const detail =
          items.length > 0
            ? items
                .map((item) => {
                  const mins = item.durationMin ? `${round1(item.durationMin)} min · ` : "";
                  return `<li>${escapeHtml(item.name)} <span>${mins}${round1(item.caloriesBurned)} kcal · ${escapeHtml(item.intensity || "moderate")}</span></li>`;
                })
                .join("")
            : `<li>${escapeHtml(act.text || act.summary || "Activity")}</li>`;

        return `
          <li class="meal-item activity-item">
            <div class="meal-top">
              <div class="meal-time">${formatTime(act.loggedAt)}</div>
              <div class="entry-actions">
                <button type="button" class="meal-edit" data-edit-activity="${act.id}">Edit</button>
                <button type="button" class="meal-delete" data-delete-activity="${act.id}">Delete</button>
              </div>
            </div>
            <ul class="meal-items">${detail}</ul>
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

  function renderWeightChart(series) {
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
          `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#f0a030" stroke="#0c0e12" stroke-width="1.5">
            <title>${p.date}: ${round1(p.weight)} ${p.unit}</title>
          </circle>`
      )
      .join("");

    els.weightChart.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Weight trendline">
        ${yTicks.join("")}
        <path d="${area}" fill="rgba(240,160,48,0.12)"></path>
        <path d="${line}" fill="none" stroke="#f0a030" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"></path>
        ${dots}
        ${xLabels.join("")}
      </svg>
    `;
  }

  function renderWeight() {
    const stats = weightStats(state);
    const unit = stats.latest?.unit || state.weightUnit || "lb";
    els.weightDateLabel.textContent = formatWeightDate(todayKey());

    if (stats.delta == null) {
      els.weightDelta.textContent = "—";
    } else {
      const sign = stats.delta > 0 ? "+" : "";
      els.weightDelta.textContent = `${sign}${stats.delta} ${unit}`;
      els.weightDelta.style.color =
        stats.delta < 0 ? "var(--green)" : stats.delta > 0 ? "var(--amber)" : "";
    }

    renderWeightChart(stats.series);

    els.weightStatsEl.innerHTML = `
      <div class="stat"><span>Latest</span><strong>${stats.latest ? `${round1(stats.latest.weight)} ${unit}` : "—"}</strong></div>
      <div class="stat"><span>Average</span><strong>${stats.avg != null ? `${stats.avg} ${unit}` : "—"}</strong></div>
      <div class="stat"><span>Entries</span><strong>${stats.series.length}</strong></div>
      <div class="stat"><span>Change</span><strong>${stats.delta == null ? "—" : `${stats.delta > 0 ? "+" : ""}${stats.delta} ${unit}`}</strong></div>
    `;

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
  }

  async function handleLog(presetText) {
    state = ensureToday(state);
    if (!hasAiKey()) {
      syncAiGate();
      showToast("Add an API key in Settings first", false);
      return;
    }

    const fromQuick = typeof presetText === "string";
    const text = (fromQuick ? presetText : els.logInput.value).trim();
    if (!text) {
      setHint(
        els.logHint,
        currentMode === "nutrition"
          ? "Enter a meal description first."
          : "Describe the activity you completed."
      );
      return;
    }

    setHint(els.logHint, "");
    setBusy(true);

    try {
      if (currentMode === "nutrition") {
        const parsed = await parseMealWithGrok({
          provider: state.provider,
          apiKey: getActiveApiKey(state),
          model: state.model,
          text,
        });
        today().meals.push({
          id: uid(),
          loggedAt: Date.now(),
          rawText: text,
          ...parsed,
        });
        persist();
        if (!fromQuick) els.logInput.value = "";
        renderAll();
        const msg = `Logged ${parsed.items.length} food item${parsed.items.length === 1 ? "" : "s"}`;
        setHint(els.logHint, msg, true);
        showToast(msg, true);
      } else {
        const parsed = await parseActivityWithGrok({
          provider: state.provider,
          apiKey: getActiveApiKey(state),
          model: state.model,
          text,
        });
        today().activities.push({
          id: uid(),
          loggedAt: Date.now(),
          rawText: text,
          text,
          ...parsed,
        });
        persist();
        if (!fromQuick) els.logInput.value = "";
        renderAll();
        const msg = `Logged ${parsed.items.length} activit${parsed.items.length === 1 ? "y" : "ies"} · ${round1(parsed.totalCaloriesBurned)} kcal burned`;
        setHint(els.logHint, msg, true);
        showToast(msg, true);
      }
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

  function deleteMeal(id) {
    if (!confirm("Delete this meal?")) return;
    today().meals = today().meals.filter((m) => m.id !== id);
    persist();
    renderAll();
    showToast("Meal deleted", true);
  }

  function deleteActivity(id) {
    if (!confirm("Delete this activity?")) return;
    today().activities = today().activities.filter((a) => a.id !== id);
    persist();
    renderAll();
    showToast("Activity deleted", true);
  }

  function deleteWeight(id) {
    if (!confirm("Delete this weight entry?")) return;
    state.weights = (state.weights || []).filter((w) => w.id !== id);
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
      <div class="field-help">Edit burn details below, or re-parse the description with AI.</div>
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
    const day = today();
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
    });
    persist();
    renderAll();
    fillSettingsForm();
    setHint(els.goalsHint, "Goals updated. Progress and trends now use these targets.", true);
  }

  function saveApi() {
    const provider = normalizeProvider(els.providerSelect.value);
    const key = els.apiKey.value.trim();
    const cfg = AI_PROVIDERS[provider];
    if (key && cfg.keyPrefix && !key.startsWith(cfg.keyPrefix)) {
      setHint(els.apiHint, `API key should start with ${cfg.keyPrefix}`);
      return;
    }
    state.provider = provider;
    state.model = normalizeModel(els.modelSelect.value, provider);
    setActiveApiKey(state, key);
    persist();
    syncAiGate();
    fillSettingsForm();
    setHint(
      els.apiHint,
      key
        ? `Saved ${cfg.label} · ${state.model}.`
        : `${cfg.label} API key cleared.`,
      true
    );
    if (key) showToast(`${cfg.label} ready to log`, true);
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setHint(els.authError, "");
    const username = els.authUsername.value;
    const password = els.authPassword.value;
    els.authSubmit.disabled = true;

    try {
      const next =
        authTab === "create"
          ? await createAccount(username, password)
          : await login(username, password);
      els.authPassword.value = "";
      enterApp(next);
    } catch (err) {
      setHint(els.authError, err.message || "Authentication failed.");
    } finally {
      els.authSubmit.disabled = false;
    }
  }

  function wireAppEvents() {
    document.querySelectorAll(".mode-tabs .mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => setMode(tab.dataset.mode));
    });

    document.querySelectorAll(".view-tabs .tab").forEach((tab) => {
      tab.addEventListener("click", () => setView(tab.dataset.view));
    });

    els.settingsBtn?.addEventListener("click", () => setMode("settings"));
    els.logJumpBtn?.addEventListener("click", () => {
      setView("today");
      updateLogVisibility();
      syncLogPanel();
      renderQuickActions();
      els.logInput.focus();
    });

    document.querySelectorAll("[data-qa-type]").forEach((tab) => {
      tab.addEventListener("click", () => {
        if (qaEditType === tab.dataset.qaType) return;
        state.quickActions = readQaEditor();
        qaEditType = tab.dataset.qaType;
        setHint(els.qaHint, "");
        renderQaEditor();
      });
    });

    els.onboardProviders?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-onboard-provider]");
      if (!btn) return;
      onboardProvider = btn.getAttribute("data-onboard-provider");
      renderOnboard();
      setHint(els.onboardHint, "");
    });
    els.onboardSaveBtn?.addEventListener("click", saveOnboardApi);
    els.onboardApiKey?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveOnboardApi();
      }
    });

    els.saveQaBtn?.addEventListener("click", saveQuickActions);

    els.quickActions?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-qa-id]");
      if (!btn || btn.disabled) return;
      const id = btn.getAttribute("data-qa-id");
      const action = activeQuickActions().find((a) => a.id === id);
      if (!action) return;
      handleLog(action.prompt);
    });

    els.logBtn.addEventListener("click", () => handleLog());
    els.logInput.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleLog();
      }
    });

    els.mealList.addEventListener("click", (e) => {
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
    els.saveApiBtn.addEventListener("click", saveApi);
    els.providerSelect.addEventListener("change", onProviderChange);
    els.saveGoogleClientBtn?.addEventListener("click", saveGoogleClient);
    els.driveSyncBtn?.addEventListener("click", handleDriveSyncNow);

    els.editClose.addEventListener("click", closeEditModal);
    els.editSave.addEventListener("click", saveEdit);
    els.editReparse.addEventListener("click", reparseEdit);
    els.editModal.addEventListener("click", (e) => {
      if (e.target === els.editModal) closeEditModal();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        window.MMC.flushDrivePush?.(true);
      }
    });
    window.addEventListener("pagehide", () => {
      window.MMC.flushDrivePush?.(true);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.editModal.hidden) closeEditModal();
    });
  }

  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      authTab = tab.dataset.authTab;
      syncAuthTab();
    });
  });

  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.googleSignInBtn?.addEventListener("click", handleGoogleSignIn);
  els.authSaveGoogleClient?.addEventListener("click", () => {
    const value = els.authGoogleClientId.value.trim();
    setGoogleClientId(value);
    if (els.googleClientId) els.googleClientId.value = value;
    syncGoogleAuthUi();
    setHint(
      els.authError,
      value ? "Google Client ID saved. You can Continue with Google." : "Google Client ID cleared.",
      Boolean(value)
    );
  });

  fillProviderSelect();

  // Boot
  const existing = getSession();
  if (existing) {
    enterApp(existing);
    if (existing.provider === "google") syncFromDrive();
  } else {
    authTab = hasAccounts() ? "login" : "create";
    showAuth();
  }
})();
