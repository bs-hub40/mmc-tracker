const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const context = { window: { MMC: {} }, console };
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, "js/storage.js"), "utf8"),
  context,
  { filename: "js/storage.js" }
);

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

const right = (args) => MMC.energyBudgetValueRight(args);

// Screenshot-like cut: under goal, room left to the teal maint+burn line.
assert(
  right({ foodKcal: 1949, goalKcal: 1989, deficitUntil: 2480 }) === "531 in deficit",
  "cutting under goal shows remaining deficit kcal, not leftover-to-goal"
);
assert(
  right({ foodKcal: 1949, goalKcal: 1989, deficitUntil: 2480 }) !== "40 left",
  "does not restated leftover-to-goal"
);

// Past goal, still under teal — remaining deficit, not % of goal.
assert(
  right({ foodKcal: 2100, goalKcal: 1989, deficitUntil: 2480 }) === "380 in deficit",
  "cutting past goal still shows remaining deficit kcal"
);

// Past teal — over maintenance, no fake remaining deficit.
assert(
  right({ foodKcal: 2600, goalKcal: 1989, deficitUntil: 2480 }) === "120 over maint",
  "past deficitUntil shows over-maint amount"
);

// Logged burn raises deficitUntil (maint + burn).
assert(
  right({ foodKcal: 1949, goalKcal: 1989, deficitUntil: 2680 }) === "731 in deficit",
  "includes burn in remaining deficit room"
);

// Not a cut — keep % of goal.
assert(
  right({ foodKcal: 1949, goalKcal: 1989, deficitUntil: 1989 }) === "98% of goal",
  "no meaningful deficitUntil keeps % of goal"
);
assert(
  right({ foodKcal: 1949, goalKcal: 1989, deficitUntil: null }) === "98% of goal",
  "missing deficitUntil keeps % of goal"
);
assert(
  right({ foodKcal: 500, goalKcal: 0, deficitUntil: null }) === "",
  "no goal and no cut is empty"
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
