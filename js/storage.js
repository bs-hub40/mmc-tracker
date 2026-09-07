window.MMC = window.MMC || {};

Object.assign(window.MMC, {
  DEFAULT_TARGETS: {
    calories: 2236,
    protein: 162,
    fat: 78,
    carbs: 222,
    fiber: 15,
  },
  // Back-compat alias; prefer getTargets(state)
  TARGETS: {
    calories: 2236,
    protein: 162,
    fat: 78,
    carbs: 222,
    fiber: 15,
  },
  CALORIE_TOLERANCE: 0.1,
  STORAGE_KEY: "mmc-tracker-v2",
  LEGACY_KEY: "mmc-tracker-v1",
  SYSTEM_PROMPT: `You are a nutrition parser for a pro-metabolic diet tracker.
Parse the user's meal description into estimated macros.
Return ONLY valid JSON with this exact shape (no markdown, no commentary):
{
  "items": [
    { "name": "string", "calories": number, "protein": number, "fat": number, "carbs": number, "fiber": number }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalFat": number,
  "totalCarbs": number,
  "totalFiber": number
}
Rules:
- Use realistic USDA-style estimates for common foods.
- Numbers may be decimals; prefer whole numbers when reasonable.
- totals must equal the sum of item fields (within rounding).
- If a food is ambiguous, pick the most common preparation.
- Never invent fields outside the schema.`,

  ACTIVITY_SYSTEM_PROMPT: `You are an exercise energy-expenditure estimator for a nutrition + activity tracker.
Parse the user's completed activity description into estimated calorie burn for an average adult (~170 lb / 77 kg) unless body weight is stated.
Return ONLY valid JSON with this exact shape (no markdown, no commentary):
{
  "items": [
    {
      "name": "string",
      "durationMin": number,
      "caloriesBurned": number,
      "intensity": "low" | "moderate" | "high"
    }
  ],
  "totalCaloriesBurned": number,
  "summary": "string"
}
Rules:
- Use realistic MET / ACSM-style estimates.
- Split distinct activities into separate items when possible.
- durationMin should be 0 if unknown; still estimate calories if intensity/type is clear.
- totalCaloriesBurned must equal the sum of item caloriesBurned (within rounding).
- Prefer whole numbers for calories.
- Never invent fields outside the schema.`,

  todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },

  parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  },

  shiftKey(key, deltaDays) {
    const d = window.MMC.parseKey(key);
    d.setDate(d.getDate() + deltaDays);
    return window.MMC.todayKey(d);
  },

  uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  },

  emptyDay() {
    return { meals: [], activities: [] };
  },

  emptyQuickAction() {
    return { id: "", label: "", prompt: "", parsed: null };
  },

  clonePayload(value) {
    return JSON.parse(JSON.stringify(value));
  },

  sanitizeQaMealParsed(parsed) {
    if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) return null;
    const items = parsed.items.slice(0, 20).map((item) => ({
      name: String(item?.name || "Item").trim() || "Item",
      calories: Number(item?.calories) || 0,
      protein: Number(item?.protein) || 0,
      fat: Number(item?.fat) || 0,
      carbs: Number(item?.carbs) || 0,
      fiber: Number(item?.fiber) || 0,
    }));
    const sum = items.reduce(
      (acc, item) => {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.fat += item.fat;
        acc.carbs += item.carbs;
        acc.fiber += item.fiber;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
    );
    return {
      items,
      totalCalories: Number(parsed.totalCalories ?? sum.calories) || sum.calories,
      totalProtein: Number(parsed.totalProtein ?? sum.protein) || sum.protein,
      totalFat: Number(parsed.totalFat ?? sum.fat) || sum.fat,
      totalCarbs: Number(parsed.totalCarbs ?? sum.carbs) || sum.carbs,
      totalFiber: Number(parsed.totalFiber ?? sum.fiber) || sum.fiber,
    };
  },

  sanitizeQaActivityParsed(parsed) {
    if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) return null;
    const items = parsed.items.slice(0, 20).map((item) => ({
      name: String(item?.name || "Activity").trim() || "Activity",
      durationMin: Number(item?.durationMin) || 0,
      caloriesBurned: Number(item?.caloriesBurned) || 0,
      intensity: ["low", "moderate", "high"].includes(item?.intensity)
        ? item.intensity
        : "moderate",
    }));
    const sum = items.reduce((acc, item) => acc + item.caloriesBurned, 0);
    return {
      items,
      totalCaloriesBurned: Number(parsed.totalCaloriesBurned ?? sum) || sum,
      summary: String(parsed.summary || "").trim().slice(0, 240),
    };
  },

  defaultQuickActions() {
    return {
      nutrition: [
        window.MMC.emptyQuickAction(),
        window.MMC.emptyQuickAction(),
        window.MMC.emptyQuickAction(),
      ],
      activity: [
        window.MMC.emptyQuickAction(),
        window.MMC.emptyQuickAction(),
        window.MMC.emptyQuickAction(),
      ],
    };
  },

  sanitizeQuickActions(input) {
    const base = window.MMC.defaultQuickActions();
    const cleanList = (list, type) => {
      const src = Array.isArray(list) ? list : [];
      return [0, 1, 2].map((i) => {
        const item = src[i] || {};
        const label = String(item.label || "").trim().slice(0, 40);
        const prompt = String(item.prompt || "").trim().slice(0, 500);
        const parsed =
          type === "activity"
            ? window.MMC.sanitizeQaActivityParsed(item.parsed)
            : window.MMC.sanitizeQaMealParsed(item.parsed);
        return {
          id: item.id || window.MMC.uid(),
          label,
          prompt,
          parsed,
        };
      });
    };
    return {
      nutrition: cleanList(input?.nutrition ?? base.nutrition, "nutrition"),
      activity: cleanList(input?.activity ?? base.activity, "activity"),
    };
  },

  THEMES: {
    ember: {
      id: "ember",
      name: "Ember",
      hint: "Warm energy when you sit down to log.",
    },
    bloom: {
      id: "bloom",
      name: "Bloom",
      hint: "Soft and kind, so tracking feels supportive.",
    },
    grove: {
      id: "grove",
      name: "Grove",
      hint: "Fresh growth — progress you can see.",
    },
    tide: {
      id: "tide",
      name: "Tide",
      hint: "Steady calm for a daily rhythm.",
    },
    aura: {
      id: "aura",
      name: "Aura",
      hint: "A little spark of reward each time you log.",
    },
  },
  THEME_KEY: "mmc-theme-v1",
  DEFAULT_THEME: "ember",

  sanitizeTheme(id) {
    return window.MMC.THEMES[id] ? id : window.MMC.DEFAULT_THEME;
  },

  defaultState() {
    const today = window.MMC.todayKey();
    return {
      apiKey: "",
      apiKeys: { xai: "", openai: "", anthropic: "", gemini: "" },
      provider: "xai",
      model: "grok-4.6",
      theme: window.MMC.DEFAULT_THEME,
      activeDate: today,
      weightUnit: "lb",
      weights: [],
      goals: { ...window.MMC.DEFAULT_TARGETS },
      quickActions: window.MMC.defaultQuickActions(),
      updatedAt: Date.now(),
      history: {
        [today]: window.MMC.emptyDay(),
      },
    };
  },

  hydrateState(parsed) {
    const merged = {
      ...window.MMC.defaultState(),
      ...(parsed || {}),
      history: parsed?.history || {},
      weights: Array.isArray(parsed?.weights) ? parsed.weights : [],
      goals: { ...window.MMC.DEFAULT_TARGETS, ...(parsed?.goals || {}) },
      quickActions: window.MMC.sanitizeQuickActions(parsed?.quickActions),
      theme: window.MMC.sanitizeTheme(parsed?.theme),
      updatedAt: Number(parsed?.updatedAt) || 0,
    };
    Object.assign(merged, window.MMC.migrateAiSettings(merged));
    return window.MMC.ensureToday(merged);
  },

  mergeById(items) {
    const map = new Map();
    (items || []).forEach((item, i) => {
      if (!item) return;
      map.set(item.id || `anon-${i}-${item.loggedAt || 0}`, item);
    });
    return [...map.values()];
  },

  mergeWeights(a, b) {
    const map = new Map();
    [...(a || []), ...(b || [])].forEach((entry) => {
      if (!entry) return;
      const key = entry.date || entry.id;
      if (!key) return;
      const prev = map.get(key);
      if (!prev || (entry.loggedAt || 0) >= (prev.loggedAt || 0)) {
        map.set(key, entry);
      }
    });
    return [...map.values()];
  },

  mergeTrackerState(localState, remoteState) {
    if (!remoteState) return localState;
    if (!localState) return remoteState;
    const localHist = localState.history || {};
    const remoteHist = remoteState.history || {};
    const history = {};
    const keys = new Set([...Object.keys(localHist), ...Object.keys(remoteHist)]);
    keys.forEach((key) => {
      const left = localHist[key] || window.MMC.emptyDay();
      const right = remoteHist[key] || window.MMC.emptyDay();
      history[key] = {
        meals: window.MMC.mergeById([...(left.meals || []), ...(right.meals || [])]),
        activities: window.MMC.mergeById([
          ...(left.activities || []),
          ...(right.activities || []),
        ]),
      };
    });
    const localTs = Number(localState.updatedAt) || 0;
    const remoteTs = Number(remoteState.updatedAt) || 0;
    const newer = remoteTs >= localTs ? remoteState : localState;
    const older = newer === remoteState ? localState : remoteState;
    return window.MMC.hydrateState({
      ...newer,
      history,
      weights: window.MMC.mergeWeights(localState.weights, remoteState.weights),
      apiKeys: { ...(older.apiKeys || {}), ...(newer.apiKeys || {}) },
      apiKey: newer.apiKey || older.apiKey || "",
      theme: window.MMC.sanitizeTheme(newer.theme || older.theme),
      updatedAt: Math.max(localTs, remoteTs),
    });
  },

  normalizeProvider(provider) {
    return window.MMC.AI_PROVIDERS?.[provider] ? provider : "xai";
  },

  normalizeModel(model, provider) {
    const providerId = window.MMC.normalizeProvider(provider || "xai");
    const cfg = window.MMC.AI_PROVIDERS?.[providerId];
    if (!cfg) return "grok-4.6";
    if (cfg.models.some((m) => m.id === model)) return model;
    return cfg.defaultModel;
  },

  migrateAiSettings(stateLike) {
    const provider = window.MMC.normalizeProvider(stateLike.provider || "xai");
    const apiKeys = {
      xai: "",
      openai: "",
      anthropic: "",
      gemini: "",
      ...(stateLike.apiKeys || {}),
    };
    // Legacy single apiKey → xAI key
    if (!apiKeys.xai && stateLike.apiKey) {
      apiKeys.xai = stateLike.apiKey;
    }
    return {
      provider,
      model: window.MMC.normalizeModel(stateLike.model, provider),
      apiKeys,
      apiKey: apiKeys[provider] || "",
    };
  },

  getActiveApiKey(state) {
    const provider = window.MMC.normalizeProvider(state.provider);
    const keys = state.apiKeys || {};
    return keys[provider] || (provider === "xai" ? state.apiKey || "" : "");
  },

  setActiveApiKey(state, key) {
    const provider = window.MMC.normalizeProvider(state.provider);
    if (!state.apiKeys) {
      state.apiKeys = { xai: "", openai: "", anthropic: "", gemini: "" };
    }
    state.apiKeys[provider] = key;
    if (provider === "xai") state.apiKey = key;
  },

  getTargets(state) {
    return {
      ...window.MMC.DEFAULT_TARGETS,
      ...(state?.goals || {}),
    };
  },

  sanitizeGoals(input) {
    const defaults = window.MMC.DEFAULT_TARGETS;
    const num = (v, fallback) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? window.MMC.round1(n) : fallback;
    };
    return {
      calories: num(input.calories, defaults.calories),
      protein: num(input.protein, defaults.protein),
      fat: num(input.fat, defaults.fat),
      carbs: num(input.carbs, defaults.carbs),
      fiber: num(input.fiber, defaults.fiber),
    };
  },

  migrateLegacy(raw) {
    const legacy = JSON.parse(raw);
    const today = window.MMC.todayKey();
    const date = legacy.date || today;
    const state = window.MMC.defaultState();
    state.apiKey = legacy.apiKey || "";
    Object.assign(state, window.MMC.migrateAiSettings(state));
    state.activeDate = today;
    state.history = {
      [date]: {
        meals: Array.isArray(legacy.meals) ? legacy.meals : [],
        activities: [],
      },
    };
    if (!state.history[today]) state.history[today] = window.MMC.emptyDay();
    return state;
  },

  loadAnonymousState() {
    try {
      const rawV2 = localStorage.getItem(window.MMC.STORAGE_KEY);
      if (rawV2) {
        return window.MMC.hydrateState(JSON.parse(rawV2));
      }

      const rawV1 = localStorage.getItem(window.MMC.LEGACY_KEY);
      if (rawV1) return window.MMC.ensureToday(window.MMC.migrateLegacy(rawV1));
      return window.MMC.defaultState();
    } catch {
      return window.MMC.defaultState();
    }
  },

  loadState() {
    // Prefer per-user storage when logged in
    const session = window.MMC.getSession?.();
    if (session?.id && window.MMC.loadUserState) {
      return window.MMC.loadUserState(session.id);
    }
    return window.MMC.loadAnonymousState();
  },

  saveState(state) {
    const session = window.MMC.getSession?.();
    if (session?.id && window.MMC.saveUserState) {
      window.MMC.saveUserState(session.id, state);
      return;
    }
    localStorage.setItem(window.MMC.STORAGE_KEY, JSON.stringify(state));
  },

  ensureToday(state) {
    const today = window.MMC.todayKey();
    if (!state.history[today]) {
      state.history[today] = window.MMC.emptyDay();
    }
    if (state.activeDate !== today) {
      state.activeDate = today;
    }
    return state;
  },

  getDay(state, dateKey = state.activeDate) {
    if (!state.history[dateKey]) {
      state.history[dateKey] = window.MMC.emptyDay();
    }
    const day = state.history[dateKey];
    if (!Array.isArray(day.meals)) day.meals = [];
    if (!Array.isArray(day.activities)) day.activities = [];
    return day;
  },

  peekDay(state, dateKey) {
    const day = state.history[dateKey];
    if (!day) return window.MMC.emptyDay();
    return {
      meals: Array.isArray(day.meals) ? day.meals : [],
      activities: Array.isArray(day.activities) ? day.activities : [],
    };
  },

  mealTotals(meals) {
    return (meals || []).reduce(
      (acc, meal) => {
        acc.calories += meal.totalCalories || 0;
        acc.protein += meal.totalProtein || 0;
        acc.fat += meal.totalFat || 0;
        acc.carbs += meal.totalCarbs || 0;
        acc.fiber += meal.totalFiber || 0;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
    );
  },

  activityBurn(activities) {
    return (activities || []).reduce((sum, act) => {
      const burned =
        Number(act.totalCaloriesBurned ?? act.caloriesBurned ?? 0) || 0;
      return sum + burned;
    }, 0);
  },

  dayEnergy(day, state) {
    const targets = window.MMC.getTargets(state);
    const food = window.MMC.mealTotals(day.meals);
    const burned = window.MMC.activityBurn(day.activities);
    const netCalories = Math.max(0, food.calories - burned);
    const remaining = targets.calories - netCalories;
    const budget = targets.calories + burned;
    return {
      food,
      burned,
      netCalories,
      remaining,
      budget,
      targets,
      macros: {
        ...food,
        calories: netCalories,
      },
    };
  },

  isGoalHit(energyOrTotals, state) {
    const t = window.MMC.getTargets(state);
    const calLo = t.calories * (1 - window.MMC.CALORIE_TOLERANCE);
    const calHi = t.calories * (1 + window.MMC.CALORIE_TOLERANCE);
    const calories =
      energyOrTotals.netCalories ??
      energyOrTotals.macros?.calories ??
      energyOrTotals.calories ??
      0;
    const protein = energyOrTotals.food?.protein ?? energyOrTotals.protein ?? 0;
    const fat = energyOrTotals.food?.fat ?? energyOrTotals.fat ?? 0;
    const carbs = energyOrTotals.food?.carbs ?? energyOrTotals.carbs ?? 0;
    const fiber = energyOrTotals.food?.fiber ?? energyOrTotals.fiber ?? 0;
    return (
      calories >= calLo &&
      calories <= calHi &&
      protein >= t.protein &&
      fat <= t.fat &&
      carbs >= t.carbs &&
      fiber > t.fiber
    );
  },

  isValidDateKey(key) {
    return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key);
  },

  dayHasEntry(state, dateKey) {
    const day = window.MMC.peekDay(state, dateKey);
    if (day.meals.length > 0 || day.activities.length > 0) return true;
    return (state.weights || []).some(
      (w) => w && window.MMC.isValidDateKey(w.date) && w.date === dateKey
    );
  },

  dayStatus(state, dateKey) {
    const day = window.MMC.peekDay(state, dateKey);
    const energy = window.MMC.dayEnergy(day, state);
    const logged = day.meals.length > 0;
    const hasEntry = window.MMC.dayHasEntry(state, dateKey);
    const hit = logged && window.MMC.isGoalHit(energy, state);
    return {
      day,
      energy,
      totals: energy.macros,
      food: energy.food,
      burned: energy.burned,
      logged,
      hasEntry,
      hit,
    };
  },

  getStreak(state) {
    const today = window.MMC.todayKey();
    // Count consecutive days with any meal, activity, or weight entry.
    // If today is still empty, keep showing yesterday's run (day not over yet).
    let streak = 0;
    let cursor = window.MMC.dayHasEntry(state, today)
      ? today
      : window.MMC.shiftKey(today, -1);

    while (window.MMC.dayHasEntry(state, cursor)) {
      streak += 1;
      cursor = window.MMC.shiftKey(cursor, -1);
      if (streak > 400) break;
    }
    return streak;
  },

  getBestStreak(state) {
    const historyKeys = Object.keys(state.history || {}).filter(
      window.MMC.isValidDateKey
    );
    const weightDates = (state.weights || [])
      .map((w) => w?.date)
      .filter(window.MMC.isValidDateKey);
    const allKeys = [...new Set([...historyKeys, ...weightDates])].sort();
    const current = window.MMC.getStreak(state);
    if (!allKeys.length) return current;

    const end = window.MMC.todayKey();
    let start = allKeys[0];
    // Only scan up to ~2 years back to avoid pathological keys locking the UI.
    const floor = window.MMC.shiftKey(end, -800);
    if (start < floor) start = floor;

    let best = 0;
    let run = 0;
    let cursor = start;
    let guard = 0;
    while (cursor <= end && guard < 900) {
      if (window.MMC.dayHasEntry(state, cursor)) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
      cursor = window.MMC.shiftKey(cursor, 1);
      guard += 1;
    }
    return Math.max(best, current);
  },

  rangeKeys(days) {
    const today = window.MMC.todayKey();
    const keys = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      keys.push(window.MMC.shiftKey(today, -i));
    }
    return keys;
  },

  trendSeries(state, days) {
    return window.MMC.rangeKeys(days).map((key) => {
      const status = window.MMC.dayStatus(state, key);
      return {
        key,
        label: window.MMC.shortDayLabel(key, days),
        totals: status.totals,
        food: status.food,
        burned: status.burned,
        hit: status.hit,
        logged: status.logged,
        activityCount: status.day.activities.length,
      };
    });
  },

  shortDayLabel(key, span) {
    const d = window.MMC.parseKey(key);
    if (span <= 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  },

  round1(n) {
    return Math.round(Number(n) * 10) / 10;
  },

  avg(nums) {
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  },

  sortedWeights(state) {
    return [...(state.weights || [])].sort((a, b) => {
      if (a.date === b.date) return (a.loggedAt || 0) - (b.loggedAt || 0);
      return a.date < b.date ? -1 : 1;
    });
  },

  upsertWeight(state, { weight, unit, date }) {
    const dateKey = date || window.MMC.todayKey();
    const value = window.MMC.round1(Number(weight));
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("Enter a valid weight.");
    }

    const entry = {
      id: window.MMC.uid(),
      date: dateKey,
      weight: value,
      unit: unit === "kg" ? "kg" : "lb",
      loggedAt: Date.now(),
    };

    const weights = Array.isArray(state.weights) ? [...state.weights] : [];
    const idx = weights.findIndex((w) => w.date === dateKey);
    if (idx >= 0) {
      entry.id = weights[idx].id;
      weights[idx] = entry;
    } else {
      weights.push(entry);
    }

    state.weights = weights;
    state.weightUnit = entry.unit;
    return entry;
  },

  weightStats(state) {
    const series = window.MMC.sortedWeights(state);
    if (!series.length) {
      return { series, latest: null, first: null, delta: null, avg: null };
    }
    const first = series[0];
    const latest = series[series.length - 1];
    const delta = window.MMC.round1(latest.weight - first.weight);
    const avg = window.MMC.round1(
      window.MMC.avg(series.map((w) => w.weight))
    );
    return { series, latest, first, delta, avg };
  },

  formatWeightDate(key) {
    const d = window.MMC.parseKey(key);
    return d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  },
});
