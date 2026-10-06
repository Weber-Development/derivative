// CommonJS: require() must work too.
const core = require("@sweberdev/derivative");
const node = require("@sweberdev/derivative/node");
const react = require("@sweberdev/derivative-react");
for (const [label, mod, names] of [
  ["core", core, ["createFeed", "parseChangelog", "renderPage"]],
  ["node", node, ["buildFeed", "writeOutputs"]],
  ["react", react, ["WhatsNew", "useChangelog"]],
]) {
  const missing = names.filter((n) => !(n in mod));
  if (missing.length) throw new Error(`${label} (CJS) is missing: ${missing.join(", ")}`);
}
console.log("smoke.cjs ok");
