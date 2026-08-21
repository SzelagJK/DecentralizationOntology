  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const PAPER_CITATION = "J. K. Szelag, A. Abadi, and M. Naseri, ‘Defining Decentralization: An Ontological Perspective,’ §§VIII–XI, Definition 5, Propositions 1–2, Figures 4–6.";
  const SUBJECT_COLORS = ["#37c0fb", "#3974a8", "#d98200", "#7a53a6", "#d34f62", "#008b95", "#846b36", "#5664d2"];
  const CENTER_COLORS = ["#e15759", "#4e79a7", "#59a14f", "#f28e2b", "#af7aa1", "#76b7b2", "#edc948", "#9c755f"];
  const ANCHOR_CATALOG = {
    ownership: {
      label: "Ownership",
      noun: "Owner",
      description: "Who effectively owns the vertices or resources on which the subject is realized."
    },
    authority: {
      label: "Authority",
      noun: "Authority",
      description: "Who can coordinate, approve, order, or otherwise exercise effective decision authority."
    },
    trust: {
      label: "Trust",
      noun: "Trust domain",
      description: "Which common root of trust or administrative trust domain the vertices depend on."
    },
    governance: {
      label: "Governance",
      noun: "Governing body",
      description: "Which organization, committee, or consortium supplies the governing interpretation."
    },
    custom: {
      label: "Custom interpretation",
      noun: "Center",
      description: "A disclosed system-specific interpretation not covered by the paper's examples."
    }
  };
  const MIXED_TYPES = ["path", "star", "ring", "wheel", "mesh", "tree", "random", "regular", "ba", "smallworld", "geometric", "community", "bipartite", "core", "lollipop", "complete"];
  const PLANE_SIZE = 700;
  const PLANE_CENTER = PLANE_SIZE / 2;
  const PLANE_PAD = 55;
  const PREVIEW_NODE_LIMIT = 3000;
  const PREVIEW_EDGE_LIMIT = 6000;
  const MAX_SYSTEM_VERTICES = 250000;
  const MAX_BATCH_SYSTEMS = 100000;
  const MAX_NODE_WORK = 25000000;
  const MAX_EDGE_WORK = 100000000;
  const MAX_EDGES_PER_SYSTEM = 12500000;
  const EXACT_PREVIEW_LIMIT = 5000;
  const EXACT_PREVIEW_EDGE_LIMIT = 100000;
  const SIMPLIFIED_PREVIEW_NODES = 220;
  const SYSTEM_SELECTOR_LIMIT = 2500;
  const TABLE_PAGE_SIZE = 50;
  const EPS = 1e-9;

  const PRESET_DESCRIPTIONS = {
    "fully-random":"Unconstrained families, sizes, noise, and four to eight subjects.",
    "federated-learning":"Paper-inspired data, training, and aggregation subjects.",
    "permissioned-blockchain":"Paper-inspired consensus, ledger, and submission subjects.",
    "public-ledger":"Peer-to-peer consensus, replication, and propagation heuristic.",
    "distributed-storage":"Shard, metadata, and repair-authority heuristic.",
    "edge-delivery":"Replica, routing, and request-service heuristic.",
    "multi-region-services":"Execution, state, and discovery heuristic.",
    "iot-edge":"Sensing, actuation, and control heuristic.",
    "decentralized-identity":"Registry, issuance, and verification heuristic."
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const fmt = (value, digits = 3) => Number.isFinite(value) ? Number(value).toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1") : "—";
  const esc = value => String(value ?? "").replace(/[&<>"]/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"})[char]);
  const norm2 = (x, y) => Math.hypot(x, y);
  const nowIso = () => new Date().toISOString();

  function anchorName(value) {
    return String(value || "Unspecified anchor").trim() || "Unspecified anchor";
  }

  function anchorKey(value) {
    return anchorName(value).toLowerCase();
  }

  function slugify(value, fallback = "anchor") {
    const slug=String(value||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    return slug||fallback;
  }

  function uniqueId(base, used) {
    let id=base,index=2;
    while(used.has(id))id=`${base}-${index++}`;
    return id;
  }

  function explicitCenterLabels(value) {
    const values = Array.isArray(value) ? value : String(value || "").split(",");
    return [...new Set(values.map(item => String(item).trim()).filter(Boolean))];
  }

  function centerLabels(value, vertexId) {
    const labels = explicitCenterLabels(value);
    return labels.length ? labels : [`vertex:${vertexId}`];
  }

  function normalizeRegion(region,index,anchorId) {
    if (Array.isArray(region)) return {id:`${anchorId}-center-${index+1}`,name:`Center ${index+1}`,color:CENTER_COLORS[index%CENTER_COLORS.length],vertices:[...new Set(region.map(String))]};
    return {
      id:String(region?.id||`${anchorId}-center-${index+1}`),
      name:String(region?.name||region?.label||`Center ${index+1}`),
      color:String(region?.color||CENTER_COLORS[index%CENTER_COLORS.length]),
      vertices:[...new Set((region?.vertices||region?.vertexIds||[]).map(String))]
    };
  }

  function normalizeModelAnchors(graph, subjects, rawAnchors = null) {
    const vertexIds=(graph?.nodes||[]).map(node=>String(node.id));
    const anchors=[];
    const usedIds=new Set();
    for(const [index,raw] of (Array.isArray(rawAnchors)?rawAnchors:[]).entries()){
      const type=ANCHOR_CATALOG[raw?.type]?raw.type:"custom";
      const name=anchorName(raw?.name||raw?.label||ANCHOR_CATALOG[type].label);
      const id=uniqueId(slugify(raw?.id||name),usedIds);usedIds.add(id);
      let regions=Array.isArray(raw?.regions)?raw.regions.map((region,regionIndex)=>normalizeRegion(region,regionIndex,id)):[];
      if(!regions.length&&raw?.centers&&typeof raw.centers==="object"){
        const byLabel=new Map();
        for(const [vertexId,value] of Object.entries(raw.centers))for(const label of explicitCenterLabels(value)){
          if(!byLabel.has(label))byLabel.set(label,[]);byLabel.get(label).push(vertexId);
        }
        regions=[...byLabel.entries()].map(([label,vertices],regionIndex)=>normalizeRegion({id:`${id}-${slugify(label,"center")}`,name:label,vertices},regionIndex,id));
      }
      anchors.push({id,name,type,color:String(raw?.color||SUBJECT_COLORS[index%SUBJECT_COLORS.length]),regions});
    }

    const legacyByName=new Map();
    for(const item of subjects||[]){
      const selected=anchors.find(anchor=>anchor.id===String(item.anchorId||""))||anchors.find(anchor=>anchorKey(anchor.name)===anchorKey(item.anchor||item.anchorName));
      const legacyName=selected?.name||anchorName(item.anchor||item.anchorName);
      const groupKey=selected?`id:${selected.id}`:`name:${anchorKey(legacyName)}`;
      if(!legacyByName.has(groupKey))legacyByName.set(groupKey,{name:legacyName,anchor:selected,subjects:[]});
      legacyByName.get(groupKey).subjects.push(item);
    }
    for(const legacy of legacyByName.values()){
      let existing=legacy.anchor||anchors.find(anchor=>anchorKey(anchor.name)===anchorKey(legacy.name));
      if(!existing){
        const inferredType=Object.entries(ANCHOR_CATALOG).find(([,definition])=>anchorKey(definition.label)===anchorKey(legacy.name))?.[0]||"custom";
        const id=uniqueId(slugify(legacy.name),usedIds);usedIds.add(id);
        existing={id,name:legacy.name,type:inferredType,color:SUBJECT_COLORS[anchors.length%SUBJECT_COLORS.length],regions:[]};anchors.push(existing);
      }
      if(!existing.regions.length){
        const byLabel=new Map();
        for(const item of legacy.subjects){
          for(const [vertexId,value] of Object.entries(item.centers||item.centerRegions||{}))for(const label of explicitCenterLabels(value)){
            if(!byLabel.has(label))byLabel.set(label,new Set());byLabel.get(label).add(String(vertexId));
          }
        }
        existing.regions=[...byLabel.entries()].map(([label,vertices],regionIndex)=>normalizeRegion({id:`${existing.id}-${slugify(label,"center")}`,name:label,vertices:[...vertices]},regionIndex,existing.id));
      }
    }
    if(!anchors.length){
      anchors.push({id:"authority",name:"Authority",type:"authority",color:SUBJECT_COLORS[1],regions:[]});
    }

    const normalizedSubjects=(subjects||[]).map((item,index)=>{
      const requestedId=String(item.anchorId||"");
      const requestedName=anchorName(item.anchor||item.anchorName);
      let anchor=anchors.find(candidate=>candidate.id===requestedId)||anchors.find(candidate=>anchorKey(candidate.name)===anchorKey(requestedName));
      if(!anchor)anchor=anchors[0];
      return {...item,id:String(item.id||`subject-${index+1}`),anchorId:anchor.id,anchor:anchor.name};
    });
    return {anchors,subjects:normalizedSubjects,vertexIds};
  }

  function getAnchor(anchorId, anchors = state.anchors) {
    return (anchors||[]).find(anchor=>anchor.id===anchorId)||null;
  }

  function subjectAnchor(item, anchors = state.anchors) {
    return getAnchor(item?.anchorId,anchors)||anchors?.find(anchor=>anchorKey(anchor.name)===anchorKey(item?.anchor))||null;
  }

  function subjectAnchorName(item, anchors = state.anchors) {
    return subjectAnchor(item,anchors)?.name||anchorName(item?.anchor);
  }

  function buildAnchorCenterFamilies(anchors, vertexIds) {
    const families = new Map();
    for (const anchor of anchors||[]) {
      const family=new Map();
      for(const region of anchor.regions||[]){
        for(const vertexId of region.vertices||[]){
          if(!family.has(vertexId))family.set(vertexId,[]);
          if(!family.get(vertexId).includes(region.id))family.get(vertexId).push(region.id);
        }
      }
      for (const vertexId of vertexIds) if (!family.has(vertexId)) family.set(vertexId, [`vertex:${vertexId}`]);
      families.set(anchor.id,family);
      families.set(anchorKey(anchor.name),family);
    }
    return families;
  }

  function resolvedCenterIds(item, vertexIds, families = null) {
    const family = families?.get(item.anchorId)||families?.get(anchorKey(item.anchor));
    const centers = item.centers || item.centerRegions || {};
    return [...new Set(vertexIds.flatMap(vertexId => family?.get(vertexId) || centerLabels(centers[vertexId], vertexId)))];
  }

  function profileEntryLabel(name, anchor) {
    return `${String(name || "Unnamed subject").trim() || "Unnamed subject"} · ${anchorName(anchor)}`;
  }

  const state = {
    graph: {nodes: [], edges: []},
    subjects: [],
    anchors: [],
    activeAnchorId: null,
    assignCenter: null,
    editorPane: "profile",
    activeView: "landing",
    tool: "select",
    edgeStart: null,
    assignSubjectId: null,
    selected: null,
    viewBox: {x: 0, y: 0, w: PLANE_SIZE, h: PLANE_SIZE},
    drag: null,
    history: [],
    future: [],
    fieldSnapshot: null,
    currentEvaluation: null,
    benchmark: null,
    simulation: {
      templates: [],
      anchorTemplates: [],
      results: [],
      running: false,
      cancelled: false,
      lastConfig: null,
      batchId: 0,
      preset: "fully-random",
      previewPoints: []
    },
    single: {chartPoints: []},
    results: {
      selectedSystem: null,
      page: 1,
      panel: "table",
      subjectEnabled: {},
      chartPoints: [],
      chartRecords: [],
      visibleRecords: [],
      sharedGroups: [],
      sharedPoints: [],
      previewSystem: null,
      previewMode: "auto",
      previewCache: {key:null,data:null}
    },
    compare: {
      systems: [],
      referenceId: null,
      scope: "all",
      mode: "aggregate",
      subject: null,
      subjectSet: null,
      chartPoints: [],
      nextId: 1
    }
  };

  const EXAMPLES = {
    flVanilla: {
      name: "Vanilla federated learning",
      note: "Figure 4: one aggregation server, four client data/training nodes.",
      graph: {
        nodes: [
          {id: "v1", label: "v1", x: 350, y: 350},
          {id: "v2", label: "v2", x: 175, y: 175},
          {id: "v3", label: "v3", x: 525, y: 175},
          {id: "v4", label: "v4", x: 175, y: 525},
          {id: "v5", label: "v5", x: 525, y: 525}
        ],
        edges: edgeObjects([["v1","v2"],["v1","v3"],["v1","v4"],["v1","v5"]])
      },
      anchors: paperExampleAnchors(),
      subjects: [
        subject("data", "Data storage", "ownership", 4, {v2:1,v3:1,v4:1,v5:1}, 1, SUBJECT_COLORS[0]),
        subject("training", "Model training", "authority", 4, {v2:1,v3:1,v4:1,v5:1}, 1, SUBJECT_COLORS[1]),
        subject("aggregation", "Aggregation", "authority", 1, {v1:1}, 1, SUBJECT_COLORS[2])
      ]
    },
    flDecentralized: {
      name: "Decentralized federated learning",
      note: "Figure 5: five clients and three collaborative aggregation authorities.",
      graph: {
        nodes: [
          {id: "v1", label: "v1", x: 350, y: 350},
          {id: "v2", label: "v2", x: 175, y: 525},
          {id: "v3", label: "v3", x: 175, y: 175},
          {id: "v4", label: "v4", x: 525, y: 525},
          {id: "v5", label: "v5", x: 525, y: 175}
        ],
        edges: edgeObjects([["v1","v2"],["v1","v3"],["v1","v4"],["v1","v5"],["v2","v4"],["v3","v5"]])
      },
      anchors: paperExampleAnchors(),
      subjects: [
        subject("data", "Data storage", "ownership", 5, {v1:1,v2:1,v3:1,v4:1,v5:1}, 1, SUBJECT_COLORS[0]),
        subject("training", "Model training", "authority", 5, {v1:1,v2:1,v3:1,v4:1,v5:1}, 1, SUBJECT_COLORS[1]),
        subject("aggregation", "Aggregation", "authority", 3, {v1:1,v2:1,v3:1}, 1, SUBJECT_COLORS[2])
      ]
    },
    blockchainOne: {
      name: "Permissioned blockchain 1",
      note: "Figure 6, first assignment: sole ordering node, four ledger replicas, three submitters.",
      graph: blockchainGraph(),
      anchors: paperExampleAnchors(),
      subjects: [
        subject("consensus", "Consensus", "authority", 1, {v2:1}, 1, SUBJECT_COLORS[2]),
        subject("ledger", "Ledger replication", "ownership", 4, {v2:1,v3:1,v4:1,v5:1}, 1, SUBJECT_COLORS[0]),
        subject("transactions", "Transaction submission", "authority", 3, {v1:1,v6:1,v7:1}, 1, SUBJECT_COLORS[1])
      ]
    },
    blockchainTwo: {
      name: "Permissioned blockchain 2",
      note: "Figure 6, second assignment: shared consensus, full ledger replication, two gateways.",
      graph: blockchainGraph(),
      anchors: paperExampleAnchors(),
      subjects: [
        subject("consensus", "Consensus", "authority", 4, {v2:1,v3:1,v4:1,v5:1}, 1, SUBJECT_COLORS[2]),
        subject("ledger", "Ledger replication", "ownership", 7, {v1:1,v2:1,v3:1,v4:1,v5:1,v6:1,v7:1}, 1, SUBJECT_COLORS[0]),
        subject("transactions", "Transaction submission", "authority", 2, {v3:1,v4:1}, 1, SUBJECT_COLORS[1])
      ]
    }
  };

  function paperExampleAnchors() {
    return [
      {id:"ownership",name:"Ownership",type:"ownership",color:SUBJECT_COLORS[0],regions:[]},
      {id:"authority",name:"Authority",type:"authority",color:SUBJECT_COLORS[1],regions:[]}
    ];
  }

  function subject(id, name, anchorId, delta, realizations, epsilon, color) {
    const definition=ANCHOR_CATALOG[anchorId];
    return {id, name, anchorId, anchor:definition?.label||anchorId, delta, realizations, epsilon, color};
  }

  function edgeObjects(pairs) {
    return pairs.map(([a,b], index) => ({id: `e${index + 1}-${a}-${b}`, a, b}));
  }

  function blockchainGraph() {
    return {
      nodes: [
        {id:"v1",label:"v1",x:55,y:350}, {id:"v2",label:"v2",x:205,y:350},
        {id:"v3",label:"v3",x:330,y:205}, {id:"v4",label:"v4",x:330,y:495},
        {id:"v5",label:"v5",x:455,y:350}, {id:"v6",label:"v6",x:575,y:350},
        {id:"v7",label:"v7",x:655,y:350}
      ],
      edges: edgeObjects([
        ["v1","v2"], ["v2","v3"], ["v2","v4"], ["v2","v5"],
        ["v3","v4"], ["v3","v5"], ["v4","v5"], ["v5","v6"], ["v6","v7"]
      ])
    };
  }

  function captureModel() {
    return clone({graph: state.graph, subjects: state.subjects, anchors: state.anchors});
  }

  function pushHistory(snapshot = captureModel()) {
    state.history.push(snapshot);
    if (state.history.length > 60) state.history.shift();
    state.future = [];
    updateHistoryButtons();
  }

  function restoreModel(snapshot) {
    state.graph = clone(snapshot.graph);
    const model=normalizeModelAnchors(state.graph,clone(snapshot.subjects||[]),clone(snapshot.anchors||null));
    state.subjects = model.subjects;
    state.anchors = model.anchors;
    state.activeAnchorId = state.anchors[0]?.id||null;
    state.selected = null;
    state.edgeStart = null;
    state.assignSubjectId = null;
    state.assignCenter = null;
    setTool("select", false);
    invalidateEvaluation();
    refreshWorkspace();
  }

  function undo() {
    if (!state.history.length) return;
    state.future.push(captureModel());
    restoreModel(state.history.pop());
    updateHistoryButtons();
    toast("Undid the last model change.");
  }

  function redo() {
    if (!state.future.length) return;
    state.history.push(captureModel());
    restoreModel(state.future.pop());
    updateHistoryButtons();
    toast("Redid the model change.");
  }

  function updateHistoryButtons() {
    $("#undoBtn").disabled = !state.history.length;
    $("#redoBtn").disabled = !state.future.length;
  }

  function invalidateEvaluation() {
    state.currentEvaluation = null;
    renderSingleResults();
  }

  function loadExample(key, recordHistory = true) {
    const example = EXAMPLES[key];
    if (!example) return;
    if (recordHistory && state.graph.nodes.length) pushHistory();
    state.graph = clone(example.graph);
    const model=normalizeModelAnchors(state.graph,clone(example.subjects),clone(example.anchors));
    state.subjects = model.subjects;
    state.anchors = model.anchors;
    state.activeAnchorId = state.anchors[0]?.id||null;
    state.selected = null;
    state.edgeStart = null;
    state.assignSubjectId = null;
    state.assignCenter = null;
    state.viewBox = {x: 0, y: 0, w: PLANE_SIZE, h: PLANE_SIZE};
    setTool("select", false);
    invalidateEvaluation();
    syncSimulationTemplates(false);
    refreshWorkspace();
    if (recordHistory) toast(`Loaded ${example.name}.`);
  }

  function setActiveView(view) {
    state.activeView = view;
    $$(".view").forEach(el => el.classList.toggle("active", el.id === `${view}View`));
    $$(".tab").forEach(el => {
      const active = el.dataset.view === view;
      el.classList.toggle("active", active);
      el.setAttribute("aria-selected", String(active));
    });
    if (view === "results") renderResults();
    if (view === "single") renderSingleResults();
    if (view === "compare") renderComparison();
    if (view === "simulate") {
      syncSimulationTemplates(false);
      updateSimulationEstimate();
    }
    if (view === "workspace") requestAnimationFrame(renderGraph);
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  function validateModel(graph = state.graph, subjects = state.subjects, anchors = state.anchors) {
    if(!anchors?.length&&subjects?.length){const migrated=normalizeModelAnchors(graph,subjects,null);subjects=migrated.subjects;anchors=migrated.anchors;}
    const errors = [];
    const warnings = [];
    const ok = [];
    if (!graph.nodes.length) errors.push("The topology must contain at least one vertex.");
    const ids = graph.nodes.map(node => String(node.id).trim());
    const idSet = new Set(ids);
    if (idSet.size !== ids.length) errors.push("Vertex identifiers must be unique.");
    if (ids.some(id => !id)) errors.push("Every vertex needs a non-empty identifier.");
    const edgeKeys = new Set();
    for (const edge of graph.edges) {
      if (!idSet.has(edge.a) || !idSet.has(edge.b)) errors.push(`Connection ${edge.a}–${edge.b} references a missing vertex.`);
      if (edge.a === edge.b) errors.push(`Self-loop at ${edge.a} is not admitted by this simple-graph implementation.`);
      const key = [edge.a, edge.b].sort().join("\u0000");
      if (edgeKeys.has(key)) errors.push(`Duplicate connection ${edge.a}–${edge.b}.`);
      edgeKeys.add(key);
    }
    if (graph.nodes.length) ok.push(`${graph.nodes.length} unique vertices and ${graph.edges.length} simple undirected connections.`);
    if (!anchors?.length) errors.push("Declare at least one anchor interpretation and its center family.");
    const anchorIds=new Set();
    const anchorNames=new Set();
    for(const [anchorIndex,anchor] of (anchors||[]).entries()){
      const id=String(anchor.id||"").trim();
      const name=String(anchor.name||"").trim();
      if(!id)errors.push(`Anchor ${anchorIndex+1} needs a stable identifier.`);
      if(anchorIds.has(id))errors.push(`Anchor identifier ${id} must be unique.`);else anchorIds.add(id);
      const nameKey=anchorKey(name);
      if(!name)errors.push(`Anchor ${anchorIndex+1} needs a disclosed interpretation name.`);
      if(anchorNames.has(nameKey))errors.push(`Anchor interpretation ${name} must be unique.`);else anchorNames.add(nameKey);
      if(!ANCHOR_CATALOG[anchor.type])warnings.push(`${name||`Anchor ${anchorIndex+1}`}: unknown catalogue type; treated as a custom contextual interpretation.`);
      const regionIds=new Set(),regionNames=new Set();
      for(const [regionIndex,region] of (anchor.regions||[]).entries()){
        const regionId=String(region.id||"").trim();
        const regionName=String(region.name||"").trim();
        if(!regionId)errors.push(`${name||"Anchor"}: center ${regionIndex+1} needs a stable identifier.`);
        if(regionIds.has(regionId))errors.push(`${name||"Anchor"}: center identifier ${regionId} must be unique within the family.`);else regionIds.add(regionId);
        if(!regionName)errors.push(`${name||"Anchor"}: center ${regionIndex+1} needs a name.`);
        const regionNameKey=regionName.toLowerCase();
        if(regionNames.has(regionNameKey))warnings.push(`${name||"Anchor"}: center name ${regionName} is repeated.`);else regionNames.add(regionNameKey);
        if(!(region.vertices||[]).length)warnings.push(`${name||"Anchor"} · ${regionName||`Center ${regionIndex+1}`}: empty regions do not affect µ.`);
        for(const vertexId of region.vertices||[])if(!idSet.has(String(vertexId)))errors.push(`${name||"Anchor"} · ${regionName||`Center ${regionIndex+1}`}: missing vertex ${vertexId}.`);
      }
      const explicitlyCovered=new Set((anchor.regions||[]).flatMap(region=>region.vertices||[]).map(String));
      const singletonCount=ids.filter(id=>!explicitlyCovered.has(id)).length;
      if(singletonCount&&(anchor.regions||[]).length)warnings.push(`${name||"Anchor"}: ${singletonCount} uncovered vert${singletonCount===1?"ex is":"ices are"} completed as singleton center${singletonCount===1?"":"s"}, as required by the paper's completion convention.`);
    }
    if (!subjects.length) errors.push("Add at least one subject–anchor pair to produce vectors and an aggregate.");
    const pairs = subjects.map(item => `${String(item.name || "").trim().toLowerCase()}\u0000${subjectAnchor(item,anchors)?.id||String(item.anchorId||item.anchor||"").toLowerCase()}`);
    if (new Set(pairs).size !== pairs.length) errors.push("Each declared subject–anchor pair must be unique.");
    for (const item of subjects) {
      const subjectText = String(item.name || "").trim();
      const resolvedAnchor=subjectAnchor(item,anchors);
      const anchorText = resolvedAnchor?.name||String(item.anchor || "").trim();
      const prefix = profileEntryLabel(subjectText, anchorText);
      if (!subjectText) errors.push("Every profile entry needs a subject name.");
      if (!resolvedAnchor) errors.push(`${subjectText || "Unnamed subject"}: select a declared anchor interpretation.`);
      if (!Number.isInteger(Number(item.delta)) || Number(item.delta) < 1) errors.push(`${prefix}: projection multiplicity δ must be a positive integer.`);
      if (!Number.isFinite(Number(item.epsilon)) || Number(item.epsilon) <= 0) errors.push(`${prefix}: subject weight ε must be strictly positive.`);
      const entries = Object.entries(item.realizations || {});
      if (!entries.length) errors.push(`${prefix}: assign at least one realization location.`);
      let sum = 0;
      for (const [vertexId, countRaw] of entries) {
        const count = Number(countRaw);
        if (!idSet.has(vertexId)) errors.push(`${prefix}: realization location ${vertexId} is not on the canvas.`);
        if (!Number.isInteger(count) || count < 1) errors.push(`${prefix}: each realization count must be a positive integer.`);
        sum += Number.isFinite(count) ? count : 0;
      }
      if (sum !== Number(item.delta)) errors.push(`${prefix}: realization counts sum to ${sum}, but δ is ${item.delta}.`);
      if (entries.length > Number(item.delta)) errors.push(`${prefix}: λ cannot exceed δ (currently ${entries.length} > ${item.delta}).`);
    }
    if (subjects.length && !errors.some(msg => msg.includes("subject") || msg.includes("δ") || msg.includes("realization") || msg.includes("ε") || msg.includes("λ"))) {
      ok.push(`${subjects.length} declared subject–anchor pair${subjects.length === 1 ? "" : "s"} satisfy 1 ≤ λ ≤ δ and ε > 0.`);
    }
    if (graph.nodes.length) {
      const components = countComponentsFromGraph(graph);
      if (components > 1) warnings.push(`The topology has ${components} connected components. The paper does not prescribe this edge case; removal effects are evaluated over the component forest and the report flags the extension.`);
      else ok.push("The topology is connected.");
      if (!graph.edges.length && graph.nodes.length > 1) warnings.push("The topology has no connections; Proposition 2 returns zero for every subject.");
    }
    return {valid: errors.length === 0, errors, warnings, ok};
  }

  function countComponentsFromGraph(graph) {
    const index = new Map(graph.nodes.map((node, i) => [node.id, i]));
    const adj = Array.from({length: graph.nodes.length}, () => []);
    for (const edge of graph.edges) {
      const a = index.get(edge.a), b = index.get(edge.b);
      if (a == null || b == null || a === b) continue;
      adj[a].push(b); adj[b].push(a);
    }
    return countComponents(adj).length;
  }

  function countComponents(adj) {
    const seen = new Uint8Array(adj.length);
    const components = [];
    for (let start = 0; start < adj.length; start++) {
      if (seen[start]) continue;
      const nodes = [];
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const v = stack.pop();
        nodes.push(v);
        for (const w of adj[v]) if (!seen[w]) { seen[w] = 1; stack.push(w); }
      }
      components.push(nodes);
    }
    return components;
  }

  function buildAdjacency(n, edges) {
    const adj = Array.from({length: n}, () => []);
    for (const pair of edges) {
      const a = Array.isArray(pair) ? pair[0] : pair.a;
      const b = Array.isArray(pair) ? pair[1] : pair.b;
      if (a == null || b == null || a === b || a < 0 || b < 0 || a >= n || b >= n) continue;
      adj[a].push(b);
      adj[b].push(a);
    }
    return adj;
  }

  function analyzeTopology(adj) {
    const n = adj.length;
    const disc = new Int32Array(n); disc.fill(-1);
    const low = new Int32Array(n);
    const parent = new Int32Array(n); parent.fill(-1);
    const subtreeSize = new Int32Array(n); subtreeSize.fill(1);
    const compId = new Int32Array(n); compId.fill(-1);
    const treeChildren = Array.from({length: n}, () => []);
    const postOrder = [];
    const components = [];
    let timer = 0;

    for (let root = 0; root < n; root++) {
      if (disc[root] !== -1) continue;
      const compIndex = components.length;
      const compNodes = [];
      disc[root] = low[root] = timer++;
      compId[root] = compIndex;
      const stack = [{v: root, next: 0}];
      while (stack.length) {
        const frame = stack[stack.length - 1];
        const v = frame.v;
        if (frame.next < adj[v].length) {
          const w = adj[v][frame.next++];
          if (disc[w] === -1) {
            parent[w] = v;
            treeChildren[v].push(w);
            disc[w] = low[w] = timer++;
            compId[w] = compIndex;
            stack.push({v: w, next: 0});
          } else if (w !== parent[v]) {
            low[v] = Math.min(low[v], disc[w]);
          }
        } else {
          stack.pop();
          compNodes.push(v);
          postOrder.push(v);
          if (parent[v] !== -1) {
            const p = parent[v];
            low[p] = Math.min(low[p], low[v]);
            subtreeSize[p] += subtreeSize[v];
          }
        }
      }
      components.push(compNodes);
    }

    const articulation = new Uint8Array(n);
    for (let v = 0; v < n; v++) {
      if (parent[v] === -1) articulation[v] = treeChildren[v].length > 1 ? 1 : 0;
      else articulation[v] = treeChildren[v].some(child => low[child] >= disc[v]) ? 1 : 0;
    }
    return {n, adj, disc, low, parent, subtreeSize, compId, treeChildren, postOrder, components, articulation};
  }

  function computeSubjectMetrics(topology, input, nodeLabel) {
    const {n, adj, low, disc, parent, subtreeSize, compId, treeChildren, postOrder, components, articulation} = topology;
    const lambda = input.supportIndices.length;
    const delta = Number(input.delta);
    const epsilon = Number(input.epsilon);
    const centerIds = [...new Set((input.centerIds || input.supportIndices.map(index => `vertex:${index}`)).map(String))];
    const mu = centerIds.length;
    const subtreeSupport = new Int32Array(n);
    const componentSupport = new Int32Array(components.length);
    for (const v of input.supportIndices) {
      subtreeSupport[v] = 1;
      componentSupport[compId[v]] += 1;
    }
    for (const v of postOrder) if (parent[v] !== -1) subtreeSupport[parent[v]] += subtreeSupport[v];

    let rv = 0;
    let gs = 0;
    const articulationVertices = [];
    const componentSizes = components.map(nodes => nodes.length);
    const betterComponent=(a,b)=>b<0||componentSupport[a]>componentSupport[b]||(componentSupport[a]===componentSupport[b]&&componentSizes[a]>componentSizes[b]);let primaryComponent=-1,secondaryComponent=-1;
    for(let index=0;index<componentSizes.length;index++){if(betterComponent(index,primaryComponent)){secondaryComponent=primaryComponent;primaryComponent=index;}else if(betterComponent(index,secondaryComponent))secondaryComponent=index;}
    const stronger=(candidate,reference)=>candidate.subjectCount>reference.subjectCount||(candidate.subjectCount===reference.subjectCount&&candidate.size>reference.size);
    for (const v of input.supportIndices) {
      if (!articulation[v]) continue;
      rv++;
      if(articulationVertices.length<30)articulationVertices.push(nodeLabel(v));
      let reference={size:0,subjectCount:0};
      let separatedSize = 0;
      let separatedSupport = 0;
      for (const child of treeChildren[v]) {
        if (low[child] >= disc[v]) {
          const size = subtreeSize[child];
          const subjectCount = subtreeSupport[child];
          const candidate={size,subjectCount};if(stronger(candidate,reference))reference=candidate;
          separatedSize += size;
          separatedSupport += subjectCount;
        }
      }
      const ownComp = compId[v];
      const remainderSize = componentSizes[ownComp] - 1 - separatedSize;
      const remainderSupport = componentSupport[ownComp] - 1 - separatedSupport;
      if (remainderSize > 0){const candidate={size:remainderSize,subjectCount:remainderSupport};if(stronger(candidate,reference))reference=candidate;}
      const otherComponent=primaryComponent!==ownComp?primaryComponent:secondaryComponent;
      if(otherComponent>=0){const candidate={size:componentSizes[otherComponent],subjectCount:componentSupport[otherComponent]};if(stronger(candidate,reference))reference=candidate;}
      gs = Math.max(gs, Math.max(0, n - 1 - reference.size));
    }

    let re=Infinity,weakestCount=0;const weakestVertices=[];
    for(const index of input.supportIndices){const degree=adj[index].length;if(degree<re){re=degree;weakestCount=1;weakestVertices.length=0;weakestVertices.push(nodeLabel(index));}else if(degree===re){weakestCount++;if(weakestVertices.length<30)weakestVertices.push(nodeLabel(index));}}
    if(!Number.isFinite(re))re=0;
    let tl;
    if (mu === 1) tl = 0;
    else if (rv === 0) tl = 1;
    else tl = Math.exp(-((rv * rv) * Math.pow(gs, epsilon)) / Math.max(1, n));

    const edgeCount = adj.reduce((sum, list) => sum + list.length, 0) / 2;
    let il;
    if (edgeCount === 0 || mu === 1) il = 0;
    else if (re <= 0) il = 0;
    else if (re === n - 1 && lambda > 1) il = 1;
    else il = Math.exp(1 - Math.pow(lambda / Math.max(1, n), -((epsilon * epsilon) / re)));
    tl = clamp(tl, 0, 1);
    il = clamp(il, 0, 1);
    return {
      id: input.id,
      name: profileEntryLabel(input.name, input.anchor),
      subjectName: input.name,
      anchorId: input.anchorId,
      anchor: anchorName(input.anchor),
      color: input.color,
      delta,
      lambda,
      mu,
      centerIds: centerIds.slice(0, 30),
      centersTruncated: centerIds.length > 30,
      epsilon,
      rv,
      gs,
      re,
      tl,
      il,
      length: norm2(tl, il),
      classification: mu === 1 ? "Centralized" : "Decentralized",
      distribution: lambda > 1 ? "Distributed" : "Undistributed",
      supportVertices: input.supportIndices.slice(0, 30).map(nodeLabel),
      supportTruncated: input.supportIndices.length > 30,
      articulationVertices,
      articulationTruncated:rv>articulationVertices.length,
      weakestVertices,
      weakestTruncated:weakestCount>weakestVertices.length,
      coverage: n ? lambda / n : 0,
      dispersion: delta > 0 ? lambda / delta : 0,
      colocated: Math.max(0, delta - lambda)
    };
  }

  function evaluateIndexedSystem({id, name, source, n, adj, subjectInputs, nodeLabel, metadata = {}}) {
    const topology = analyzeTopology(adj);
    const subjects = subjectInputs.map(input => computeSubjectMetrics(topology, input, nodeLabel));
    const decentralizedCount = subjects.filter(item => item.mu > 1).length;
    const supportFrequency = new Uint32Array(n);let unionSupport=0,sharedSupportVertices=0;
    for (const input of subjectInputs) for (const vertex of input.supportIndices) {
      if(supportFrequency[vertex]===0)unionSupport++;
      else if(supportFrequency[vertex]===1)sharedSupportVertices++;
      supportFrequency[vertex]++;
    }
    const totalDelta = subjects.reduce((sum,item)=>sum+item.delta,0);
    const supportAssignments = subjects.reduce((sum,item)=>sum+item.lambda,0);
    const distributionProfile = {
      unionSupport,
      unionCoverage: n ? unionSupport / n : 0,
      totalDelta,
      supportAssignments,
      colocatedRealizations: Math.max(0,totalDelta-supportAssignments),
      crossSubjectOverlap: Math.max(0,supportAssignments-unionSupport),
      sharedSupportVertices,
      meanCoverage: subjects.length ? subjects.reduce((sum,item)=>sum+item.coverage,0)/subjects.length : 0,
      meanDispersion: subjects.length ? subjects.reduce((sum,item)=>sum+item.dispersion,0)/subjects.length : 0
    };
    let systemClass = "Centralized";
    if (subjects.length && decentralizedCount === subjects.length) systemClass = "Fully decentralized";
    else if (decentralizedCount > 0) systemClass = "Partially decentralized";
    const systemDistribution = unionSupport > 1 ? "Distributed" : "Undistributed";
    const aggregate = subjects.length ? {
      tl: subjects.reduce((sum, item) => sum + item.tl, 0) / subjects.length,
      il: subjects.reduce((sum, item) => sum + item.il, 0) / subjects.length
    } : {tl: 0, il: 0};
    aggregate.length = norm2(aggregate.tl, aggregate.il);
    const m = adj.reduce((sum, list) => sum + list.length, 0) / 2;
    return {
      id,
      name,
      source,
      n,
      m,
      componentCount: topology.components.length,
      subjects,
      aggregate,
      systemClass,
      systemDistribution,
      distributionProfile,
      dimensionality: decentralizedCount,
      subjectCount: subjects.length,
      evaluatedAt: nowIso(),
      metadata
    };
  }

  function evaluateGraphModel(graph, subjects, identity = {}, anchors = identity.anchors || null) {
    const normalized=normalizeModelAnchors(graph,subjects,anchors);
    subjects=normalized.subjects;
    anchors=normalized.anchors;
    const index = new Map(graph.nodes.map((node, i) => [node.id, i]));
    const edges = graph.edges.map(edge => [index.get(edge.a), index.get(edge.b)]);
    const adj = buildAdjacency(graph.nodes.length, edges);
    const centerFamilies = buildAnchorCenterFamilies(anchors, graph.nodes.map(node => node.id));
    const inputs = subjects.map(item => {
      const vertexIds = Object.keys(item.realizations || {});
      const anchor=subjectAnchor(item,anchors);
      return {
        id: item.id,
        name: item.name,
        anchorId: anchor?.id,
        anchor: anchor?.name||anchorName(item.anchor),
        color: item.color,
        delta: Number(item.delta),
        epsilon: Number(item.epsilon),
        centerIds: resolvedCenterIds(item, vertexIds, centerFamilies),
        supportIndices: vertexIds.map(vertexId => index.get(vertexId)).filter(value => value != null)
      };
    });
    return evaluateIndexedSystem({
      id: identity.id || "current",
      name: identity.name || "Current workspace",
      source: identity.source || "current",
      n: graph.nodes.length,
      adj,
      subjectInputs: inputs,
      nodeLabel: i => graph.nodes[i]?.label || graph.nodes[i]?.id || `v${i+1}`,
      metadata: identity.metadata || {citation: PAPER_CITATION}
    });
  }

  function evaluateCurrent() {
    const validation = validateModel();
    if (!validation.valid) {
      toast("Resolve the blocking checks before evaluation.", "error");
      return;
    }
    state.currentEvaluation = evaluateGraphModel(state.graph, state.subjects, {}, state.anchors);
    renderSingleResults();
    setActiveView("single");
    toast("Ontology and both propositions evaluated.");
  }

  function runPaperBenchmarks() {
    const expectations = {
      flVanilla: {subjects: [[1,.779],[1,.779],[0,0]], aggregate: [.667,.519]},
      flDecentralized: {subjects: [[.670,1],[.670,1],[.670,.748]], aggregate: [.670,.916]},
      blockchainOne: {subjects: [[0,0],[.319,.815],[.867,.264]], aggregate: [.395,.360]},
      blockchainTwo: {subjects: [[.319,.815],[.076,1],[1,.596]], aggregate: [.465,.804]}
    };
    const failures = [];
    for (const [key, expected] of Object.entries(expectations)) {
      const example = EXAMPLES[key];
      const result = evaluateGraphModel(example.graph, example.subjects, {id:key,name:example.name,source:"benchmark"}, example.anchors);
      result.subjects.forEach((item, i) => {
        if (Math.abs(item.tl - expected.subjects[i][0]) > .004 || Math.abs(item.il - expected.subjects[i][1]) > .004) {
          failures.push(`${example.name}: ${item.name}`);
        }
      });
      if (Math.abs(result.aggregate.tl - expected.aggregate[0]) > .004 || Math.abs(result.aggregate.il - expected.aggregate[1]) > .004) failures.push(`${example.name}: aggregate`);
    }
    state.benchmark = {passed: failures.length === 0, failures};
    const badge = $("#benchmarkBadge");
    if (state.benchmark.passed) {
      badge.className = "benchmark-badge good";
      badge.textContent = "✓ 4/4 paper examples reproduced within ±0.004";
    } else {
      badge.className = "benchmark-badge bad";
      badge.textContent = `Benchmark mismatch: ${failures.join(", ")}`;
    }
  }

  globalThis.DecentralizationSandboxMetrics = {
    ANCHOR_CATALOG,
    EXAMPLES,
    analyzeTopology,
    buildAdjacency,
    buildAnchorCenterFamilies,
    evaluateGraphModel,
    evaluateIndexedSystem,
    normalizeModelAnchors,
    validateModel
  };
