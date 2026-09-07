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
  LOG_SYSTEM_PROMPT: `You are a stateless nutrition and activity parser for the app Log it.

RESET: Treat this message as a brand-new request. Do not use prior conversation, chat memory, or any remembered profile of this person. Ignore assumed usual meals, brands, body weight, or workout habits. Use only (1) this system instruction, (2) the person context block if present in the user message, and (3) the log text in this turn.

Task: Classify the log as food, physical activity, or both. It may be one item or a full-day recap. Split recaps into separate meals and workouts, then estimate nutrition and/or calorie burn.

Return ONLY valid JSON with this exact shape (no markdown, no commentary):
{
  "kind": "food" | "activity" | "both",
  "meals": [
    {
      "label": "string",
      "source": "string",
      "items": [
        { "name": "string", "calories": number, "protein": number, "fat": number, "carbs": number, "fiber": number }
      ],
      "totalCalories": number,
      "totalProtein": number,
      "totalFat": number,
      "totalCarbs": number,
      "totalFiber": number
    }
  ],
  "activities": [
    {
      "label": "string",
      "source": "string",
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
  ]
}

Classification:
- kind "food": fill meals; set activities to [].
- kind "activity": fill activities; set meals to [].
- kind "both": fill both when the text includes eating AND movement.
- Split named or obvious sittings into separate meals (breakfast, lunch, dinner, snacks, "later I had…"). Foods eaten together in one sitting stay in one meal with multiple items.
- Split distinct workout sessions into separate activities. Movements in the same session stay as items inside one activity.
- label: short name like "Breakfast" or "Walk". source: the slice of the user's text for that entry.
- Never invent meals, workouts, foods, drinks, oils, or extra sets that were not mentioned.

Person context (if present in the user message):
- Current weight is the latest scale reading. Use it for calorie-burn math. Do not substitute a remembered or average weight when it is provided.
- Age and sex may slightly refine burn; they do not change food database values.
- Goal weight is background only; do not adjust today's food or burn to "hit" the goal.
- Do not echo person context in the JSON.

Food accuracy:
- Estimate from USDA FoodData Central / standard reference values (or a named chain's published item if they named the restaurant).
- Honor stated amounts, units, and prep (raw vs cooked, grilled, fried, with butter/oil). If amount is missing, assume a common adult portion and put that assumption in the item name, e.g. "Chicken breast (6 oz cooked, assumed)".
- Count what they ate: cooking fat, sauces, milk/sugar in coffee, oil on salad, dressing — only if stated or clearly implied by the prep word (fried, sautéed, buttered).
- Do not add unmentioned sides, drinks, or "typical breakfast extras".
- Meat: if they give ounces without raw/cooked, treat as cooked edible portion.
- Prefer whole numbers for calories; macros may be one decimal. Item totals must equal meal totals (within rounding). Fiber only from foods that contain it.

Activity accuracy:
- Burn kcal ≈ MET × body_kg × hours. MET from the Compendium of Physical Activities (or ACSM equivalents). body_kg = provided weight in kg, or lb ÷ 2.2046. If no current weight, use 77 kg (170 lb).
- Map intensity honestly: easy walk ~2.5–3.5 MET, brisk walk ~4–5, easy jog ~7, running 6 mph ~9.8, general weights ~3.5–6, vigorous circuit ~6–8. Do not inflate.
- Strength training: count working time they described; do not treat long rest as high-intensity cardio.
- If duration is missing, set durationMin to 0 and estimate from a typical session of that type, putting the assumed minutes in the item name.
- totalCaloriesBurned must equal the sum of item caloriesBurned (within rounding). Prefer whole numbers for calories.

Never invent fields outside this schema.`,

  SYSTEM_PROMPT: `You are a stateless nutrition parser for Log it.
RESET: Treat this as a brand-new request. Do not use prior conversation, chat memory, or remembered meals/brands for this person. Use only this instruction, any person context in the user message, and the meal text.

Parse the meal into estimated macros. Return ONLY valid JSON:
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
- USDA FoodData Central / standard reference values (or a named chain's published item).
- Honor stated amounts and prep (raw vs cooked, fried, buttered). If amount is missing, assume a common adult portion and put that in the item name.
- Include cooking fat/sauces only if stated or clearly implied by prep. Do not add unmentioned sides or drinks.
- Meat ounces without raw/cooked = cooked edible portion.
- Totals must equal item sums (within rounding). Prefer whole-number calories. Never invent fields.`,

  ACTIVITY_SYSTEM_PROMPT: `You are a stateless exercise energy-expenditure estimator for Log it.
RESET: Treat this as a brand-new request. Do not use prior conversation, chat memory, or a remembered body weight/workout habit. Use only this instruction, any person context in the user message, and the activity text.

Return ONLY valid JSON:
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
- kcal ≈ MET × body_kg × hours. MET from the Compendium of Physical Activities / ACSM. body_kg from person context current weight (lb ÷ 2.2046), else 77 kg.
- Map intensity honestly (easy walk ~3 MET, brisk ~4.5, easy jog ~7, 6 mph run ~9.8, general weights ~3.5–6). Do not inflate.
- Strength work: count described working time; long rest is not high-intensity cardio.
- Split distinct activities into separate items. If duration is unknown, durationMin 0 and assume a typical session in the item name.
- Totals must equal item sums. Prefer whole-number calories. Never invent fields.`,

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
      goalWeight: null,
      profile: {
        age: null,
        sex: "",
        setupDone: false,
        heightIn: null,
        heightUnit: "in",
        bodyFat: null,
        activityPal: null,
        strategy: "",
      },
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
      goalWeight: window.MMC.sanitizeGoalWeight(parsed?.goalWeight),
      profile: window.MMC.sanitizeProfile(parsed?.profile),
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
      goalWeight:
        newer.goalWeight !== undefined
          ? window.MMC.sanitizeGoalWeight(newer.goalWeight)
          : window.MMC.sanitizeGoalWeight(older.goalWeight),
      profile: window.MMC.sanitizeProfile({
        ...(older.profile || {}),
        ...(newer.profile || {}),
      }),
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

  sanitizeAge(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const age = Math.round(n);
    if (age < 1 || age > 120) return null;
    return age;
  },

  sanitizeSex(value) {
    const s = String(value || "").trim().toUpperCase();
    return s === "M" || s === "F" ? s : "";
  },

  sanitizeProfile(input) {
    const heightUnit = input?.heightUnit === "cm" ? "cm" : "in";
    return {
      age: window.MMC.sanitizeAge(input?.age),
      sex: window.MMC.sanitizeSex(input?.sex),
      setupDone: Boolean(input?.setupDone),
      heightIn: window.MMC.sanitizeHeightInches(input?.heightIn, "in"),
      heightUnit,
      bodyFat: window.MMC.sanitizeBodyFat(input?.bodyFat),
      activityPal: window.MMC.sanitizeActivityPal(input?.activityPal),
      strategy: window.MMC.sanitizeStrategy(input?.strategy),
    };
  },

  LB_TO_KG: 0.453592,
  IN_TO_CM: 2.54,

  ACTIVITY_LEVELS: [
    {
      pal: 1.2,
      index: 0,
      id: "sedentary",
      name: "Sedentary",
      hint: "Little to no intentional movement. Desk job, not much walking, rarely exercise.",
    },
    {
      pal: 1.375,
      index: 0.25,
      id: "light",
      name: "Lightly active",
      hint: "Light movement most days — walking, stretching, yoga, or short workouts. Not training hard.",
    },
    {
      pal: 1.55,
      index: 0.5,
      id: "moderate",
      name: "Moderately active",
      hint: "Work out 3–4 times a week at moderate effort, and you move a fair amount during the day.",
    },
    {
      pal: 1.725,
      index: 0.75,
      id: "very",
      name: "Very active",
      hint: "Train hard 4–6 times a week, and your days include a decent amount of other movement.",
    },
    {
      pal: 1.9,
      index: 1,
      id: "extreme",
      name: "Extremely active",
      hint: "Hard training 5–6 times a week and/or a physical job. High volume, sports, or work that makes you sweat.",
    },
  ],

  NUTRITION_STRATEGIES: [
    {
      id: "keto",
      name: "Ketogenic",
      short: "Short-term for blood sugar, inflammation, and fat loss. Not a long-term default.",
      long: "Usually used to lower blood sugar, inflammation, and extra body fat. Useful in the short term, not as a forever approach.",
    },
    {
      id: "animal",
      name: "Animal-based",
      short: "Balanced approach. Strong fit for active people and athletes.",
      long: "A balanced animal-based approach, including for people moving off keto, carnivore, or plant-based eating. Great for young athletes. Not the strongest fat-loss protocol.",
    },
    {
      id: "prometabolic",
      name: "Pro-metabolic",
      short: "Support metabolism, muscle, and hormones. Built for fat loss you can keep off.",
      long: "Supports metabolic function and insulin sensitivity, keeps hormones steadier, and helps protect muscle. Suggested if the goal is fat loss or better metabolic health.",
    },
  ],

  sanitizeHeightInches(value, unit) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    const inches = unit === "cm" ? n / window.MMC.IN_TO_CM : n;
    if (inches < 48 || inches > 84) return null;
    return window.MMC.round1(inches);
  },

  sanitizeBodyFat(value) {
    if (value == null || String(value).trim() === "") return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (n < 0 || n > 75) return null;
    return window.MMC.round1(n);
  },

  sanitizeActivityPal(value) {
    const n = Number(value);
    const match = (window.MMC.ACTIVITY_LEVELS || []).find((level) => level.pal === n);
    return match ? match.pal : null;
  },

  sanitizeStrategy(value) {
    const id = String(value || "").trim().toLowerCase();
    return window.MMC.NUTRITION_STRATEGIES.some((s) => s.id === id) ? id : "";
  },

  activityIndex(pal) {
    const match = (window.MMC.ACTIVITY_LEVELS || []).find((level) => level.pal === Number(pal));
    return match ? match.index : 0.5;
  },

  mifflinBmr(weightLb, heightIn, age, sex) {
    const kg = weightLb * window.MMC.LB_TO_KG;
    const cm = heightIn * window.MMC.IN_TO_CM;
    const base = 10 * kg + 6.25 * cm - 5 * age;
    return sex === "M" ? base + 5 : base - 161;
  },

  roundMacroSet(raw) {
    return {
      calories: Math.round(raw.calories),
      protein: Math.round(raw.protein),
      carbs: Math.round(raw.carbs),
      fat: Math.round(raw.fat),
    };
  },

  macrosForProtocol(strategy, calorieTarget, ctx) {
    const { index, lbm, goalLb, goalType, activityCals } = ctx;
    if (strategy === "keto") {
      const protein = 0.8 * lbm;
      const carbs = Math.min(25, calorieTarget * 0.1 / 4);
      const fat = (calorieTarget - protein * 4 - carbs * 4) / 9;
      return { protein, carbs, fat, calories: calorieTarget };
    }
    if (strategy === "animal") {
      const protein = (0.9 + index * 0.3) * goalLb;
      const carbs = (0.6 + index * 0.6) * goalLb;
      const fat = (calorieTarget - protein * 4 - carbs * 4) / 9;
      return { protein, carbs, fat, calories: calorieTarget };
    }
    const proteinMult =
      goalType === "cut"
        ? 0.7 + index * 0.02
        : goalType === "bulk"
          ? 0.85 + index * 0.02
          : 0.75 + index * 0.02;
    const fatMult =
      goalType === "cut"
        ? 0.5 + index * 0.07
        : goalType === "bulk"
          ? 0.57 + index * 0.13
          : 0.5 + index * 0.14;
    const protein = goalType === "bulk" ? proteinMult * goalLb : proteinMult * lbm;
    let fat = fatMult * lbm;
    if (goalType === "maintain" || goalType === "bulk") {
      fat += (activityCals * 0.05) / 9;
    }
    const carbs = (calorieTarget - protein * 4 - fat * 9) / 4;
    return {
      protein,
      carbs,
      fat,
      calories: protein * 4 + carbs * 4 + fat * 9,
    };
  },

  calculateMacros(input) {
    const currentLb = Number(input?.currentLb);
    const goalLb = Number(input?.goalLb);
    const heightIn = window.MMC.sanitizeHeightInches(input?.heightIn, "in");
    const sex = window.MMC.sanitizeSex(input?.sex);
    const bodyFat = window.MMC.sanitizeBodyFat(input?.bodyFat);
    const age = window.MMC.sanitizeAge(input?.age);
    const pal = window.MMC.sanitizeActivityPal(input?.pal);
    const strategy = window.MMC.sanitizeStrategy(input?.strategy);

    if (!Number.isFinite(currentLb) || currentLb <= 0) {
      return { ok: false, error: "Enter your current weight." };
    }
    if (!Number.isFinite(goalLb) || goalLb <= 0) {
      return { ok: false, error: "Enter a goal weight." };
    }
    if (heightIn == null) {
      return { ok: false, error: "Enter height between 48–84 in (122–213 cm)." };
    }
    if (!sex) {
      return { ok: false, error: "Pick M or F." };
    }
    if (bodyFat == null) {
      return { ok: false, error: "Enter body fat % between 0 and 75." };
    }
    if (!age) {
      return { ok: false, error: "Enter an age between 1 and 120." };
    }
    if (!pal) {
      return { ok: false, error: "Pick an activity level." };
    }
    if (!strategy) {
      return { ok: false, error: "Pick a nutrition strategy." };
    }

    const lbm = currentLb * (1 - bodyFat / 100);
    const goalLbm = goalLb * (1 - bodyFat / 100);
    const bmr = window.MMC.mifflinBmr(currentLb, heightIn, age, sex);
    const tdee = bmr * pal;
    const goalType =
      goalLb < currentLb ? "cut" : goalLb > currentLb ? "bulk" : "maintain";
    const calories =
      goalType === "cut" ? tdee - 500 : goalType === "bulk" ? tdee + 300 : tdee;
    const activityCals = tdee - bmr;
    const index = window.MMC.activityIndex(pal);
    const ctx = { index, lbm, goalLb, goalType, activityCals };
    const currentRaw = window.MMC.macrosForProtocol(strategy, calories, ctx);

    const goalBmr = window.MMC.mifflinBmr(goalLb, heightIn, age, sex);
    const maintTdee = goalBmr * pal;
    const maintRaw = window.MMC.macrosForProtocol(strategy, maintTdee, {
      index,
      lbm: goalLbm,
      goalLb,
      goalType: "maintain",
      activityCals: maintTdee - goalBmr,
    });

    const strategyCfg = window.MMC.NUTRITION_STRATEGIES.find((s) => s.id === strategy);
    const activityCfg = window.MMC.ACTIVITY_LEVELS.find((s) => s.pal === pal);

    return {
      ok: true,
      goalType,
      strategy,
      strategyName: strategyCfg?.name || strategy,
      strategyBlurb: strategyCfg?.long || "",
      activityName: activityCfg?.name || "",
      pal,
      index,
      bmr,
      tdee,
      lbm,
      calories,
      activityCals,
      goalBmr,
      goalLbm,
      maintTdee,
      current: window.MMC.roundMacroSet({ ...currentRaw, calories }),
      maintenance: window.MMC.roundMacroSet({ ...maintRaw, calories: maintTdee }),
    };
  },

  sanitizeGoalWeight(input) {
    if (input == null || input === "") return null;
    const raw = typeof input === "object" ? input : { weight: input };
    const value = window.MMC.round1(Number(raw.weight));
    if (!Number.isFinite(value) || value <= 0) return null;
    return {
      weight: value,
      unit: raw.unit === "kg" ? "kg" : "lb",
    };
  },

  convertWeight(value, fromUnit, toUnit) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const from = fromUnit === "kg" ? "kg" : "lb";
    const to = toUnit === "kg" ? "kg" : "lb";
    if (from === to) return window.MMC.round1(n);
    if (from === "lb") return window.MMC.round1(n * 0.45359237);
    return window.MMC.round1(n / 0.45359237);
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
