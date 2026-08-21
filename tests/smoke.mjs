import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../assets/js/core.js", import.meta.url), "utf8");
const context = vm.createContext({console});
vm.runInContext(source, context, {filename: "core.js"});

const {EXAMPLES, evaluateGraphModel, validateModel, normalizeModelAnchors} = context.DecentralizationSandboxMetrics;
const expected = {
  flVanilla: {pairs: [[1, .779, 4], [1, .779, 4], [0, 0, 1]], aggregate: [.667, .519], dimensionality: 2},
  flDecentralized: {pairs: [[.670, 1, 5], [.670, 1, 5], [.670, .748, 3]], aggregate: [.670, .916], dimensionality: 3},
  blockchainOne: {pairs: [[0, 0, 1], [.319, .815, 4], [.867, .264, 3]], aggregate: [.395, .360], dimensionality: 2},
  blockchainTwo: {pairs: [[.319, .815, 4], [.076, 1, 7], [1, .596, 2]], aggregate: [.465, .804], dimensionality: 3}
};

for (const [key, target] of Object.entries(expected)) {
  const example = EXAMPLES[key];
  const result = evaluateGraphModel(example.graph, example.subjects, {id: key, name: example.name}, example.anchors);
  assert.equal(result.dimensionality, target.dimensionality, `${key}: dimensionality`);
  result.subjects.forEach((item, index) => {
    assert.ok(Math.abs(item.tl - target.pairs[index][0]) <= .004, `${key}: pair ${index + 1} TL`);
    assert.ok(Math.abs(item.il - target.pairs[index][1]) <= .004, `${key}: pair ${index + 1} IL`);
    assert.equal(item.mu, target.pairs[index][2], `${key}: pair ${index + 1} mu`);
  });
  assert.ok(Math.abs(result.aggregate.tl - target.aggregate[0]) <= .004, `${key}: aggregate TL`);
  assert.ok(Math.abs(result.aggregate.il - target.aggregate[1]) <= .004, `${key}: aggregate IL`);
}

const distributedButCentralized = evaluateGraphModel(
  {
    nodes: [{id: "v1", label: "v1"}, {id: "v2", label: "v2"}],
    edges: [{id: "e1", a: "v1", b: "v2"}]
  },
  [{
    id: "data",
    name: "Data",
    anchorId: "ownership",
    anchor: "Ownership",
    delta: 2,
    epsilon: 1,
    color: "#37c0fb",
    realizations: {v1: 1, v2: 1}
  }],
  {},
  [{id:"ownership",name:"Ownership",type:"ownership",regions:[{id:"owner-a",name:"Operator A",vertices:["v1","v2"]}]}]
);

assert.equal(distributedButCentralized.subjects[0].lambda, 2);
assert.equal(distributedButCentralized.subjects[0].mu, 1);
assert.equal(distributedButCentralized.subjects[0].distribution, "Distributed");
assert.equal(distributedButCentralized.subjects[0].classification, "Centralized");
assert.equal(distributedButCentralized.subjects[0].tl, 0);
assert.equal(distributedButCentralized.subjects[0].il, 0);

const sharedAnchorFamily = evaluateGraphModel(
  {
    nodes: [{id: "v1", label: "v1"}, {id: "v2", label: "v2"}],
    edges: [{id: "e1", a: "v1", b: "v2"}]
  },
  [
    {
      id: "data",
      name: "Data",
      anchorId: "authority",
      anchor: "Authority",
      delta: 2,
      epsilon: 1,
      color: "#37c0fb",
      realizations: {v1: 1, v2: 1}
    },
    {
      id: "training",
      name: "Training",
      anchorId: "authority",
      anchor: "Authority",
      delta: 2,
      epsilon: 1,
      color: "#3974a8",
      realizations: {v1: 1, v2: 1}
    }
  ],
  {},
  [{id:"authority",name:"Authority",type:"authority",regions:[{id:"operator-a",name:"Operator A",vertices:["v1","v2"]}]}]
);

assert.equal(sharedAnchorFamily.subjects[1].mu, 1, "one C_a is shared by every pair using anchor a");
assert.equal(sharedAnchorFamily.subjects[1].classification, "Centralized");

const overlappingCenters = evaluateGraphModel(
  {nodes:[{id:"v1"}],edges:[]},
  [{id:"a",name:"A",anchorId:"authority",anchor:"Authority",delta:1,epsilon:1,realizations:{v1:1}}],
  {},
  [{id:"authority",name:"Authority",type:"authority",regions:[{id:"operator-a",name:"Operator A",vertices:["v1"]},{id:"operator-b",name:"Operator B",vertices:["v1"]}]}]
);
assert.equal(overlappingCenters.subjects[0].mu, 2, "overlapping center regions both intersect the support");
assert.equal(overlappingCenters.subjects[0].classification, "Decentralized");

const partialFamily = [{id:"authority",name:"Authority",type:"authority",regions:[{id:"operator-a",name:"Operator A",vertices:["v1"]}]}];
const singletonCompletion = evaluateGraphModel(
  {nodes:[{id:"v1"},{id:"v2"}],edges:[{id:"e1",a:"v1",b:"v2"}]},
  [{id:"a",name:"A",anchorId:"authority",anchor:"Authority",delta:2,epsilon:1,realizations:{v1:1,v2:1}}],
  {},
  partialFamily
);
assert.equal(singletonCompletion.subjects[0].mu, 2, "an uncovered vertex is completed as a singleton center");

const invalidRegion = validateModel(
  {nodes:[{id:"v1"}],edges:[]},
  [{id:"a",name:"A",anchorId:"authority",anchor:"Authority",delta:1,epsilon:1,realizations:{v1:1}}],
  [{id:"authority",name:"Authority",type:"authority",regions:[{id:"operator-a",name:"Operator A",vertices:["missing"]}]}]
);
assert.equal(invalidRegion.valid, false);
assert.ok(invalidRegion.errors.some(message => message.includes("missing vertex")));

const migrated = normalizeModelAnchors(
  {nodes:[{id:"v1"},{id:"v2"}],edges:[]},
  [{id:"legacy",name:"Legacy",anchor:"Authority",delta:2,epsilon:1,realizations:{v1:1,v2:1},centers:{v1:"operator-a",v2:"operator-a"}}]
);
assert.equal(migrated.anchors[0].regions[0].vertices.length, 2, "legacy per-subject labels migrate into one system-level center family");

for (const relative of ["../assets/js/anchors.js", "../assets/js/simulation.js", "../assets/js/app.js"]) {
  vm.runInContext(readFileSync(new URL(relative, import.meta.url), "utf8"), context, {filename: relative});
}
const {synthesizeSubjects, mulberry32} = context.DecentralizationSandboxCore;
const simulated = synthesizeSubjects(
  {n:6,type:"path",adj:[[1],[0,2],[1,3],[2,4],[3,5],[4]],edges:[[0,1],[1,2],[2,3],[3,4],[4,5]]},
  [
    {id:"s1",name:"Aggregation",anchorId:"authority",anchorMode:"fixed",epsilon:1,epsilonJitter:0,coverageMin:100,coverageMax:100,coverageDistribution:"fixed",multiplicityMin:1,multiplicityMax:1,multiplicityDistribution:"fixed",placement:"uniform",relation:"independent",relationStrength:0},
    {id:"s2",name:"Submission",anchorId:"authority",anchorMode:"fixed",epsilon:1,epsilonJitter:0,coverageMin:50,coverageMax:50,coverageDistribution:"fixed",multiplicityMin:1,multiplicityMax:1,multiplicityDistribution:"fixed",placement:"uniform",relation:"independent",relationStrength:0}
  ],
  mulberry32(42),
  [{id:"authority",name:"Authority",type:"authority",color:"#3974a8",enabled:true,weight:1,model:"topological",minActors:2,maxActors:2,overlapChance:0,dominantShare:50}]
);
assert.equal(simulated.generatedAnchors.length, 1, "one family is generated for a shared simulated anchor");
assert.equal(simulated.generatedAnchors[0].regions.length, 2);
assert.equal(simulated[0].anchorId, simulated[1].anchorId);

console.log("All paper benchmarks and anchor-relative edge cases passed.");
