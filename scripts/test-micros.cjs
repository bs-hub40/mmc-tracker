const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const context = {
  window: { MMC: {} },
  console,
};
vm.createContext(context);
for (const file of ["js/storage.js", "js/micros.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const MMC = context.window.MMC;
let failed = 0;

function assert(cond, message) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok  ${message}`);
  }
}

assert(MMC.emptyDay().micros.length === 0, "emptyDay includes micros[]");
assert(MMC.historyBucket("micros") === "micros", "historyBucket maps micros");
assert(MMC.MICRO_NUTRIENTS.length === 19, "curated set is 19 nutrients");

const keys = MMC.microKeys();
assert(keys.includes("vitaminA") && keys.includes("sodium"), "keys include A and sodium");

const empty = MMC.emptyMicroAmounts();
assert(empty.iron === 0 && empty.folate === 0, "empty amounts are zero");

const mid = MMC.microTargets({ profile: { sex: "" } });
assert(mid.vitaminA === 800, "default vitamin A is mid-adult 800 mcg RAE");
assert(mid.iron === 13, "default iron is mid-adult 13 mg");
assert(mid.sodium === 2300, "sodium ceiling is 2300 mg CDRR");

const male = MMC.microTargets({ profile: { sex: "M" } });
const female = MMC.microTargets({ profile: { sex: "F" } });
assert(male.iron === 8 && female.iron === 18, "iron is sex-specific when profile has M/F");
assert(male.vitaminA === 900 && female.vitaminA === 700, "vitamin A is sex-specific when profile has M/F");

const entry = MMC.sanitizeMicroEntry({
  label: "Breakfast",
  source: "2 eggs",
  items: [{ name: "2 eggs", vitaminA: 160, vitaminD: 1.1, iron: 1.2 }],
});
assert(entry && entry.items.length === 1, "sanitizeMicroEntry keeps items");
assert(entry.totals.vitaminA === 160, "totals come from items");
assert(entry.totals.iron === 1.2, "iron decimals preserved");

const summed = MMC.microDayTotals([
  entry,
  MMC.sanitizeMicroEntry({
    items: [{ name: "spinach", vitaminA: 470, iron: 2.7 }],
  }),
]);
assert(summed.vitaminA === 630, "day totals add vitamin A");
assert(summed.iron === 3.9, "day totals add iron");

assert(MMC.microPct(400, 800) === 50, "50% of target");
assert(MMC.microStatus(0, 800, "target").id === "none", "zero is none");
assert(MMC.microStatus(200, 800, "target").id === "low", "under 50% is low");
assert(MMC.microStatus(600, 800, "target").id === "mid" && MMC.microStatus(600, 800, "target").label === "", "50–99% has no chip");
assert(MMC.microStatus(800, 800, "target").id === "ok", "at target is on track");
assert(MMC.microStatus(2500, 2300, "ceiling").id === "high", "over sodium ceiling is high");
assert(MMC.microStatus(1200, 2300, "ceiling").id === "ok", "under sodium ceiling is on track");

const state = MMC.defaultState();
const today = MMC.todayKey();
MMC.appendHistoryEntry(
  state,
  "micros",
  { id: "m1", loggedAt: 1, items: entry.items, totals: entry.totals },
  today
);
assert(MMC.getDay(state, today).micros.length === 1, "appendHistoryEntry stores micros");
assert(MMC.dayHasEntry(state, today), "micros count as a day entry");
assert(MMC.stateHasLogs(state), "stateHasLogs sees micros");

const remote = MMC.defaultState();
MMC.appendHistoryEntry(
  remote,
  "micros",
  { id: "m2", loggedAt: 2, items: entry.items, totals: entry.totals },
  today
);
const merged = MMC.mergeHistoryById(state.history, remote.history, true);
assert(merged[today].micros.length === 2, "mergeHistoryById keeps micros from both sides");
assert(merged[today].meals, "merge still has meals array");

const stones = MMC.mergeTombstones(
  { micros: { m1: Date.now() } },
  MMC.emptyTombstones()
);
assert(stones.micros.m1, "tombstones include micros");
state.tombstones = stones;
MMC.applyTombstones(state);
assert(
  !state.history[today].micros.some((item) => item.id === "m1"),
  "applyTombstones drops deleted micros"
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall micros tests passed");
