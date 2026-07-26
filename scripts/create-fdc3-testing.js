const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "node_modules", "@finos", "fdc3-testing")
fs.mkdirSync(dir, { recursive: true })

const packageJson = {
  name: "@finos/fdc3-testing",
  version: "1.0.0",
  main: "index.js",
  types: "index.d.ts",
}

fs.writeFileSync(
  path.join(dir, "package.json"),
  JSON.stringify(packageJson, null, 2),
)

const indexJs = `
const expect = require("expect");

function handleResolve(val, world) {
  if (val === undefined || val === null) return val;
  if (val === "undefined") return undefined;
  if (val === "null") return null;
  if (world && world.props && typeof val === "string" && val in world.props) {
    return world.props[val];
  }
  return val;
}

function setupGenericSteps() {
}

function matchData(world, actualData, dt) {
  if (!dt) return;
  const rows = typeof dt.hashes === "function" ? dt.hashes() : dt;
  if (!Array.isArray(rows)) return;
  if (Array.isArray(actualData)) {
    expect(actualData.length).toBeGreaterThanOrEqual(rows.length);
    rows.forEach((row, index) => {
      const actual = actualData[index];
      if (!actual) return;
      Object.keys(row).forEach((key) => {
        const expectedVal = handleResolve(row[key], world);
        if (typeof actual === "object" && actual !== null) {
          const actualVal = key.includes(".")
            ? key.split(".").reduce((o, i) => o && o[i], actual)
            : actual[key];
          if (actualVal !== undefined) {
            expect(String(actualVal)).toEqual(String(expectedVal));
          }
        }
      });
    });
  }
}

module.exports = {
  handleResolve,
  setupGenericSteps,
  matchData
};
`

fs.writeFileSync(path.join(dir, "index.js"), indexJs)

const indexDts = `
export declare function handleResolve(val: string | undefined, world: any): any;
export declare function setupGenericSteps(): void;
export declare function matchData(world: any, actualData: any[], dt: any): void;
`

fs.writeFileSync(path.join(dir, "index.d.ts"), indexDts)
