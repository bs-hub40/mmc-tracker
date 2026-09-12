window.MMC = window.MMC || {};

Object.assign(window.MMC, {
  // Adult micronutrient daily targets for % of target bars.
  //
  // Source: National Academies Dietary Reference Intakes (DRI), as published
  // in the NIH Office of Dietary Supplements DRI tables
  // (https://ods.od.nih.gov/HealthInformation/nutrientrecommendations.aspx).
  // Age band: 19–50 years. Magnesium uses the 31–50 row (420 / 320 mg).
  //
  // RDAs unless noted:
  //   - Vitamin K, Potassium: Adequate Intake (AI)
  //   - Sodium: Chronic Disease Risk Reduction (CDRR) 2300 mg — a ceiling,
  //     not a goal to hit
  //
  // When profile.sex is M or F, use that row. Otherwise use the mid-adult
  // default (mean of male/female, rounded). Tracking only — not medical advice.
  MICRO_NUTRIENTS: [
    {
      key: "vitaminA",
      group: "vitamin",
      label: "Vitamin A",
      short: "A",
      unit: "mcg RAE",
      decimals: 0,
      mode: "target",
      target: { M: 900, F: 700, default: 800 },
    },
    {
      key: "vitaminD",
      group: "vitamin",
      label: "Vitamin D",
      short: "D",
      unit: "mcg",
      decimals: 1,
      mode: "target",
      target: { M: 15, F: 15, default: 15 },
    },
    {
      key: "vitaminE",
      group: "vitamin",
      label: "Vitamin E",
      short: "E",
      unit: "mg",
      decimals: 1,
      mode: "target",
      target: { M: 15, F: 15, default: 15 },
    },
    {
      key: "vitaminK",
      group: "vitamin",
      label: "Vitamin K",
      short: "K",
      unit: "mcg",
      decimals: 0,
      mode: "target",
      target: { M: 120, F: 90, default: 105 },
    },
    {
      key: "vitaminC",
      group: "vitamin",
      label: "Vitamin C",
      short: "C",
      unit: "mg",
      decimals: 0,
      mode: "target",
      target: { M: 90, F: 75, default: 83 },
    },
    {
      key: "thiamin",
      group: "vitamin",
      label: "Thiamin (B1)",
      short: "B1",
      unit: "mg",
      decimals: 2,
      mode: "target",
      target: { M: 1.2, F: 1.1, default: 1.2 },
    },
    {
      key: "riboflavin",
      group: "vitamin",
      label: "Riboflavin (B2)",
      short: "B2",
      unit: "mg",
      decimals: 2,
      mode: "target",
      target: { M: 1.3, F: 1.1, default: 1.2 },
    },
    {
      key: "niacin",
      group: "vitamin",
      label: "Niacin (B3)",
      short: "B3",
      unit: "mg",
      decimals: 1,
      mode: "target",
      target: { M: 16, F: 14, default: 15 },
    },
    {
      key: "vitaminB6",
      group: "vitamin",
      label: "Vitamin B6",
      short: "B6",
      unit: "mg",
      decimals: 2,
      mode: "target",
      target: { M: 1.3, F: 1.3, default: 1.3 },
    },
    {
      key: "folate",
      group: "vitamin",
      label: "Folate",
      short: "Folate",
      unit: "mcg DFE",
      decimals: 0,
      mode: "target",
      target: { M: 400, F: 400, default: 400 },
    },
    {
      key: "vitaminB12",
      group: "vitamin",
      label: "Vitamin B12",
      short: "B12",
      unit: "mcg",
      decimals: 2,
      mode: "target",
      target: { M: 2.4, F: 2.4, default: 2.4 },
    },
    {
      key: "calcium",
      group: "mineral",
      label: "Calcium",
      short: "Ca",
      unit: "mg",
      decimals: 0,
      mode: "target",
      target: { M: 1000, F: 1000, default: 1000 },
    },
    {
      key: "iron",
      group: "mineral",
      label: "Iron",
      short: "Fe",
      unit: "mg",
      decimals: 1,
      mode: "target",
      target: { M: 8, F: 18, default: 13 },
    },
    {
      key: "magnesium",
      group: "mineral",
      label: "Magnesium",
      short: "Mg",
      unit: "mg",
      decimals: 0,
      mode: "target",
      target: { M: 420, F: 320, default: 370 },
    },
    {
      key: "potassium",
      group: "mineral",
      label: "Potassium",
      short: "K",
      unit: "mg",
      decimals: 0,
      mode: "target",
      target: { M: 3400, F: 2600, default: 3000 },
    },
    {
      key: "zinc",
      group: "mineral",
      label: "Zinc",
      short: "Zn",
      unit: "mg",
      decimals: 1,
      mode: "target",
      target: { M: 11, F: 8, default: 9.5 },
    },
    {
      key: "selenium",
      group: "mineral",
      label: "Selenium",
      short: "Se",
      unit: "mcg",
      decimals: 0,
      mode: "target",
      target: { M: 55, F: 55, default: 55 },
    },
    {
      key: "iodine",
      group: "mineral",
      label: "Iodine",
      short: "I",
      unit: "mcg",
      decimals: 0,
      mode: "target",
      target: { M: 150, F: 150, default: 150 },
    },
    {
      key: "sodium",
      group: "mineral",
      label: "Sodium",
      short: "Na",
      unit: "mg",
      decimals: 0,
      mode: "ceiling",
      target: { M: 2300, F: 2300, default: 2300 },
    },
  ],

  MICROS_SYSTEM_PROMPT: `You are a stateless micronutrient estimator for the app Log it.

RESET: Treat this as a brand-new request. Do not use prior conversation, chat memory, or remembered meals/brands. Use only this instruction, any person context in the user message, and the food text.

Task: Estimate essential vitamin and mineral amounts for the foods described. Split named sittings into separate entries. Foods eaten together stay in one entry with multiple items.

Return ONLY valid JSON with this exact shape (no markdown, no commentary):
{
  "entries": [
    {
      "label": "string",
      "source": "string",
      "items": [
        {
          "name": "string",
          "vitaminA": number,
          "vitaminD": number,
          "vitaminE": number,
          "vitaminK": number,
          "vitaminC": number,
          "thiamin": number,
          "riboflavin": number,
          "niacin": number,
          "vitaminB6": number,
          "folate": number,
          "vitaminB12": number,
          "calcium": number,
          "iron": number,
          "magnesium": number,
          "potassium": number,
          "zinc": number,
          "selenium": number,
          "iodine": number,
          "sodium": number
        }
      ],
      "totals": {
        "vitaminA": number,
        "vitaminD": number,
        "vitaminE": number,
        "vitaminK": number,
        "vitaminC": number,
        "thiamin": number,
        "riboflavin": number,
        "niacin": number,
        "vitaminB6": number,
        "folate": number,
        "vitaminB12": number,
        "calcium": number,
        "iron": number,
        "magnesium": number,
        "potassium": number,
        "zinc": number,
        "selenium": number,
        "iodine": number,
        "sodium": number
      }
    }
  ]
}

Units (required):
- vitaminA: mcg RAE
- vitaminD: mcg (not IU; 40 IU = 1 mcg)
- vitaminE: mg alpha-tocopherol
- vitaminK: mcg
- vitaminC: mg
- thiamin, riboflavin, niacin, vitaminB6: mg
- folate: mcg DFE
- vitaminB12: mcg
- calcium, iron, magnesium, potassium, zinc, sodium: mg
- selenium, iodine: mcg

Rules:
- Estimate from USDA FoodData Central / standard reference values (or a named chain's published item).
- Honor stated amounts, units, and prep. If amount is missing, assume a common adult portion and put that assumption in the item name.
- Include cooking salt, sauces, and fortified foods only if stated or clearly implied.
- Do not add unmentioned sides, drinks, or supplements.
- Meat ounces without raw/cooked = cooked edible portion.
- Iodine is often missing from databases — estimate from typical food values (iodized salt, dairy, seafood, eggs). If truly unknown, use 0.
- Item sums must equal entry totals (within rounding). Prefer 1 decimal for small mg amounts; whole numbers for large mg/mcg.
- Never invent fields outside this schema. Never give medical advice.`,

  microKeys() {
    return window.MMC.MICRO_NUTRIENTS.map((n) => n.key);
  },

  emptyMicroAmounts() {
    return window.MMC.microKeys().reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});
  },

  sanitizeMicroNumber(value, decimals) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    const places = Number.isInteger(decimals) ? decimals : 1;
    const f = 10 ** places;
    return Math.round(n * f) / f;
  },

  sanitizeMicroAmounts(input) {
    const out = window.MMC.emptyMicroAmounts();
    const src = input && typeof input === "object" ? input : {};
    window.MMC.MICRO_NUTRIENTS.forEach((n) => {
      const raw = src[n.key] ?? src[n.short] ?? src[n.label];
      out[n.key] = window.MMC.sanitizeMicroNumber(raw, n.decimals);
    });
    return out;
  },

  addMicroAmounts(a, b) {
    const out = window.MMC.emptyMicroAmounts();
    window.MMC.MICRO_NUTRIENTS.forEach((n) => {
      out[n.key] = window.MMC.sanitizeMicroNumber(
        (Number(a?.[n.key]) || 0) + (Number(b?.[n.key]) || 0),
        n.decimals
      );
    });
    return out;
  },

  microAmountsHaveData(amounts) {
    return window.MMC.microKeys().some((key) => (Number(amounts?.[key]) || 0) > 0);
  },

  microTargets(state) {
    const sex = window.MMC.sanitizeSex(state?.profile?.sex);
    const out = {};
    window.MMC.MICRO_NUTRIENTS.forEach((n) => {
      const t = n.target || {};
      out[n.key] = sex === "M" || sex === "F" ? t[sex] : t.default;
    });
    return out;
  },

  sanitizeMicroItem(item) {
    const amounts = window.MMC.sanitizeMicroAmounts(item);
    return {
      name: String(item?.name || "Item").trim() || "Item",
      ...amounts,
    };
  },

  retotalMicroEntry(entry) {
    const items = Array.isArray(entry?.items) ? entry.items : [];
    const totals = items.reduce(
      (acc, item) => window.MMC.addMicroAmounts(acc, item),
      window.MMC.emptyMicroAmounts()
    );
    return { ...entry, items, totals };
  },

  sanitizeMicroEntry(parsed) {
    if (!parsed || typeof parsed !== "object") return null;
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const items = rawItems.slice(0, 20).map((item) => window.MMC.sanitizeMicroItem(item));
    if (!items.length) return null;
    const fromItems = items.reduce(
      (acc, item) => window.MMC.addMicroAmounts(acc, item),
      window.MMC.emptyMicroAmounts()
    );
    const given =
      parsed.totals && typeof parsed.totals === "object"
        ? window.MMC.sanitizeMicroAmounts(parsed.totals)
        : null;
    const totals = given && window.MMC.microAmountsHaveData(given) ? given : fromItems;
    return {
      label: String(parsed.label || "").trim().slice(0, 80),
      source: String(parsed.source || parsed.rawText || "").trim(),
      items,
      totals,
    };
  },

  microDayTotals(entries) {
    return (entries || []).reduce(
      (acc, entry) => window.MMC.addMicroAmounts(acc, entry?.totals),
      window.MMC.emptyMicroAmounts()
    );
  },

  formatMicroAmount(value, decimals) {
    const n = Number(value) || 0;
    const places = Number.isInteger(decimals) ? decimals : 1;
    return window.MMC.sanitizeMicroNumber(n, places).toFixed(places).replace(/\.0+$/, "").replace(
      /(\.\d*?)0+$/,
      "$1"
    );
  },

  microPct(value, target) {
    const t = Number(target) || 0;
    if (t <= 0) return 0;
    return Math.round(((Number(value) || 0) / t) * 100);
  },

  // Status labels for tracking only. Not a diagnosis.
  microStatus(value, target, mode) {
    const pct = window.MMC.microPct(value, target);
    if (mode === "ceiling") {
      if (pct >= 100) return { id: "high", label: "high" };
      if ((Number(value) || 0) <= 0) return { id: "none", label: "—" };
      return { id: "ok", label: "on track" };
    }
    if ((Number(value) || 0) <= 0) return { id: "none", label: "—" };
    if (pct < 50) return { id: "low", label: "low" };
    if (pct < 100) return { id: "mid", label: "low" };
    return { id: "ok", label: "on track" };
  },
});
