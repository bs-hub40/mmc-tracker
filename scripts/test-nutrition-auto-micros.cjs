const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const context = { window: { MMC: {} }, console };
vm.createContext(context);
for (const file of ["js/storage.js", "js/micros.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, {
    filename: file,
  });
}

const MMC = context.window.MMC;
const PROXY = "https://logit-ai.briansuttongv.workers.dev";
let failed = 0;

function assert(cond, message) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok  ${message}`);
  }
}

async function parse(task, text) {
  const response = await fetch(`${PROXY}/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5500",
    },
    body: JSON.stringify({ task, text, context: "" }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
  return payload;
}

function looksLikeMeal(data) {
  const meals = Array.isArray(data?.meals) ? data.meals : [];
  const first = meals[0] || (Array.isArray(data?.items) ? data : null);
  return Boolean(first && (first.items || []).length);
}

function looksLikeMicros(data) {
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const items = entries[0]?.items || [];
  return items.some((item) => Number(item?.vitaminB12) > 0 || Number(item?.selenium) > 0);
}

(async () => {
  const meal = { id: "meal-eggs", rawText: "2 eggs", items: [{ name: "Eggs" }] };
  const emptyPlan = MMC.planAutoMicros([meal], []);
  assert(emptyPlan.pending.length === 1, "new Nutrition meal is pending for auto micros");

  const afterManual = MMC.planAutoMicros(
    [meal],
    [{ id: "m1", rawText: "2 eggs", origin: "micros" }]
  );
  assert(
    afterManual.pending.length === 0 && afterManual.skipped.length === 1,
    "Nutrition auto skips after Micros-tab rawText"
  );

  const afterFromMeals = MMC.planAutoMicros(
    [meal],
    [{ id: "m2", rawText: "2 eggs", origin: "from-meals" }]
  );
  assert(afterFromMeals.pending.length === 0, "Nutrition auto skips after from-meals rawText");

  const walkOnly = MMC.planAutoMicros([], []);
  assert(walkOnly.pending.length === 0, "activity-only (no meals) plans no micros call");

  try {
    const logPayload = await parse("log", "2 eggs");
    assert(looksLikeMeal(logPayload), "hosted log task returns a meal for 2 eggs");
    const microsPayload = await parse("micros", "2 eggs");
    const cleaned = MMC.sanitizeMicroEntry(microsPayload.entries?.[0] || microsPayload);
    assert(Boolean(cleaned && cleaned.items.length), "hosted micros task returns a sanitizable entry");
    assert(
      looksLikeMicros(microsPayload) || MMC.microAmountsHaveData(cleaned.totals),
      "hosted micros estimate includes nutrient amounts"
    );
    console.log(
      `    log calories=${logPayload.meals?.[0]?.totalCalories ?? logPayload.totalCalories}`
    );
    console.log(
      `    micros B12=${cleaned.totals.vitaminB12} Se=${cleaned.totals.selenium} Fe=${cleaned.totals.iron}`
    );
  } catch (err) {
    failed += 1;
    console.error(`FAIL: hosted AI check: ${err.message}`);
  }

  if (failed) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log("\nnutrition auto-micros checks passed");
})();
