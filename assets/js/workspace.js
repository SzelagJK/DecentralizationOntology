"use strict";
  function refreshWorkspace(options = {}) {
    if (options.graph !== false) renderGraph();
    if (options.subjects !== false) renderSubjects();
    renderAnchors();
    renderEditorPane();
    renderGraphStats();
    renderLegend();
    renderSelectionInspector();
    renderValidation();
    updateHistoryButtons();
    updateExampleNote();
  }

  function renderGraphStats() {
    const n = state.graph.nodes.length;
    const m = state.graph.edges.length;
    const components = n ? countComponentsFromGraph(state.graph) : 0;
    $("#graphStats").textContent = `${n.toLocaleString()} ${n === 1 ? "vertex" : "vertices"} · ${m.toLocaleString()} ${m === 1 ? "edge" : "edges"}${components > 1 ? ` · ${components} connected components` : ""}`;
  }

  function renderGraph() {
    const svg = $("#graphCanvas");
    if (!svg) return;
    svg.setAttribute("viewBox", `${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.w} ${state.viewBox.h}`);
    const nodeLayer = $("#nodeLayer");
    const edgeLayer = $("#edgeLayer");
    const overlayLayer = $("#overlayLayer");
    nodeLayer.textContent = "";
    edgeLayer.textContent = "";
    overlayLayer.textContent = "";

    const allNodes = state.graph.nodes;
    const displayNodes = allNodes.length <= PREVIEW_NODE_LIMIT ? allNodes : allNodes.filter((_, i) => i % Math.ceil(allNodes.length / PREVIEW_NODE_LIMIT) === 0).slice(0, PREVIEW_NODE_LIMIT);
    const displayed = new Set(displayNodes.map(node => node.id));
    const eligibleEdges = state.graph.edges.filter(edge => displayed.has(edge.a) && displayed.has(edge.b));
    const displayEdges = eligibleEdges.length <= PREVIEW_EDGE_LIMIT ? eligibleEdges : eligibleEdges.filter((_, i) => i % Math.ceil(eligibleEdges.length / PREVIEW_EDGE_LIMIT) === 0).slice(0, PREVIEW_EDGE_LIMIT);
    const nodeMap = new Map(allNodes.map(node => [node.id, node]));
    const limit = $("#previewLimit");
    if (allNodes.length > PREVIEW_NODE_LIMIT || eligibleEdges.length > PREVIEW_EDGE_LIMIT) {
      limit.classList.remove("hidden");
      limit.textContent = `Simplified preview: ${displayNodes.length.toLocaleString()} of ${allNodes.length.toLocaleString()} vertices shown; evaluation uses the full graph.`;
    } else limit.classList.add("hidden");

    for (const edge of displayEdges) {
      const a = nodeMap.get(edge.a), b = nodeMap.get(edge.b);
      if (!a || !b) continue;
      const group = svgEl("g", {class: `edge${state.selected?.type === "edge" && state.selected.id === edge.id ? " selected" : ""}`, "data-edge-id": edge.id});
      group.append(
        svgEl("line", {class: "edge-line", x1: a.x, y1: a.y, x2: b.x, y2: b.y}),
        svgEl("line", {class: "edge-hit", x1: a.x, y1: a.y, x2: b.x, y2: b.y})
      );
      edgeLayer.appendChild(group);
    }

    const memberships = new Map();
    for (const item of state.subjects) {
      for (const vertexId of Object.keys(item.realizations || {})) {
        if (!memberships.has(vertexId)) memberships.set(vertexId, []);
        memberships.get(vertexId).push(item);
      }
    }
    const activeAnchor=ensureActiveAnchor();
    const activeFamily=buildAnchorCenterFamilies([activeAnchor],allNodes.map(node=>node.id)).get(activeAnchor.id);
    const activeRegions=new Map((activeAnchor.regions||[]).map(region=>[region.id,region]));
    for (const node of displayNodes) {
      const classes = ["node"];
      if (state.selected?.type === "node" && state.selected.id === node.id) classes.push("selected");
      if (state.edgeStart === node.id) classes.push("edge-source");
      const group = svgEl("g", {class: classes.join(" "), transform: `translate(${node.x} ${node.y})`, "data-node-id": node.id, tabindex: "0", role: "button", "aria-label": `Vertex ${node.label || node.id}`});
      const centerIds=activeFamily?.get(node.id)||[`vertex:${node.id}`];
      centerIds.slice(0,5).forEach((centerId,index)=>{
        const region=activeRegions.get(centerId),singleton=!region;
        const assigning=state.assignCenter?.anchorId===activeAnchor.id&&state.assignCenter?.regionId===centerId;
        group.appendChild(svgEl("circle",{class:`center-ring ${singleton?"singleton":"explicit"}${assigning?" assigning":""}`,r:32+index*6,stroke:region?.color||activeAnchor.color,"stroke-width":assigning?4:2.5}));
      });
      const activeSubject = state.subjects.find(item => item.id === state.assignSubjectId);
      if (activeSubject && activeSubject.realizations[node.id]) group.appendChild(svgEl("circle", {class: "assignment-ring", r: 31, stroke: activeSubject.color}));
      group.appendChild(svgEl("circle", {class: "node-core", r: 23}));
      group.appendChild(svgEl("text", {class: "node-label", y: 1}, node.label || node.id));
      const items = memberships.get(node.id) || [];
      items.slice(0, 8).forEach((item, index) => {
        const angle = (-Math.PI / 2) + index * (Math.PI * 2 / Math.min(8, items.length));
        group.appendChild(svgEl("circle", {class: "subject-dot", cx: Math.cos(angle) * 28, cy: Math.sin(angle) * 28, r: 5, fill: item.color}));
      });
      nodeLayer.appendChild(group);
    }
    if (!allNodes.length) {
      overlayLayer.appendChild(svgEl("text", {x: PLANE_CENTER, y: PLANE_CENTER - 18, "text-anchor": "middle", fill: "#66727b", "font-size": 20, "font-weight": 750}, "Start with a paper example or add a vertex"));
      overlayLayer.appendChild(svgEl("text", {x: PLANE_CENTER, y: PLANE_CENTER + 17, "text-anchor": "middle", fill: "#8a949b", "font-size": 14}, "Choose Vertex, then click the canvas"));
    }
  }

  function svgEl(tag, attributes = {}, text = null) {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    if (text != null) element.textContent = text;
    return element;
  }

  function renderLegend() {
    const legend = $("#subjectLegend");
    legend.innerHTML = state.subjects.map(item => `<span class="legend-item"><i class="legend-swatch" style="background:${esc(item.color)}"></i>${esc(profileEntryLabel(item.name, subjectAnchorName(item)))}</span>`).join("");
  }

  function renderSelectionInspector() {
    const host = $("#selectionInspector");
    if (!state.selected) {
      host.className = "selection-inspector muted";
      host.textContent = "Select a vertex or connection to inspect it.";
      return;
    }
    host.className = "selection-inspector";
    if (state.selected.type === "node") {
      const node = state.graph.nodes.find(item => item.id === state.selected.id);
      if (!node) { state.selected = null; return renderSelectionInspector(); }
      host.innerHTML = `<div class="inspector-row"><strong>Vertex</strong><input id="selectedNodeLabel" value="${esc(node.label)}" aria-label="Vertex label"><span class="muted">ID ${esc(node.id)} · (${fmt(node.x,0)}, ${fmt(node.y,0)})</span><button id="removeSelectedBtn" class="mini-btn remove" type="button">Remove</button></div>`;
      $("#selectedNodeLabel").addEventListener("focus", () => state.fieldSnapshot = captureModel());
      $("#selectedNodeLabel").addEventListener("input", event => {
        node.label = event.target.value;
        renderGraph();
      });
      $("#selectedNodeLabel").addEventListener("change", () => {
        if (state.fieldSnapshot) pushHistory(state.fieldSnapshot);
        state.fieldSnapshot = null;
        invalidateEvaluation();
        renderSubjects();
        renderValidation();
      });
      $("#removeSelectedBtn").addEventListener("click", () => removeVertex(node.id));
    } else {
      const edge = state.graph.edges.find(item => item.id === state.selected.id);
      if (!edge) { state.selected = null; return renderSelectionInspector(); }
      host.innerHTML = `<div class="inspector-row"><strong>Connection</strong><span>${esc(edge.a)} ↔ ${esc(edge.b)}</span><button id="removeSelectedBtn" class="mini-btn remove" type="button">Remove</button></div>`;
      $("#removeSelectedBtn").addEventListener("click", () => removeEdge(edge.id));
    }
  }

  function renderSubjects() {
    const host = $("#subjectList");
    if (!state.subjects.length) {
      host.innerHTML = `<div class="empty-subjects"><p>No evaluation-profile entries yet. Add a subject together with the anchor under which its centers are interpreted.</p><button class="btn primary compact" data-action="add-subject" type="button">+ Add first pair</button></div>`;
      return;
    }
    const evaluationMap = new Map((state.currentEvaluation?.subjects || []).map(item => [item.id, item]));
    const centerFamilies = buildAnchorCenterFamilies(state.anchors, state.graph.nodes.map(node => node.id));
    host.innerHTML = state.subjects.map(item => {
      const entries = Object.entries(item.realizations || {});
      const sum = entries.reduce((total, [,count]) => total + (Number(count) || 0), 0);
      const result = evaluationMap.get(item.id);
      const anchor=subjectAnchor(item),anchorOptions=state.anchors.map(candidate=>`<option value="${esc(candidate.id)}" ${candidate.id===anchor?.id?"selected":""}>${esc(candidate.name)}</option>`).join("");
      const cardInvalid = !String(item.name || "").trim() || !anchor || sum !== Number(item.delta) || !entries.length || Number(item.epsilon) <= 0;
      const rows = entries.map(([vertexId,count]) => {
        const used = new Set(entries.map(([id]) => id));
        const options = state.graph.nodes.map(node => `<option value="${esc(node.id)}" ${node.id === vertexId ? "selected" : ""} ${used.has(node.id) && node.id !== vertexId ? "disabled" : ""}>${esc(node.label || node.id)} (${esc(node.id)})</option>`).join("");
        const labels=(centerFamilies.get(anchor?.id)?.get(vertexId)||[]).map(centerId=>anchor?.regions?.find(region=>region.id===centerId)?.name||"Singleton center");
        return `<div class="realization-row compact-realization" data-vertex="${esc(vertexId)}"><select data-field="realization-vertex" data-subject="${esc(item.id)}" aria-label="Realization vertex"><option value="${esc(vertexId)}" ${state.graph.nodes.some(node => node.id === vertexId) ? "" : "selected"}>${state.graph.nodes.some(node => node.id === vertexId) ? "" : `Missing: ${esc(vertexId)}`}</option>${options}</select><input data-field="realization-count" data-subject="${esc(item.id)}" data-vertex="${esc(vertexId)}" type="number" min="1" step="1" value="${esc(count)}" aria-label="Realizations at ${esc(vertexId)}"><span class="realization-centers" title="${esc(labels.join(", "))}">${esc(labels.join(" + "))}</span><button class="icon-btn" data-action="remove-realization" data-subject="${esc(item.id)}" data-vertex="${esc(vertexId)}" type="button" aria-label="Remove realization location">×</button></div>`;
      }).join("");
      const previewMu = resolvedCenterIds(item, entries.map(([vertexId]) => vertexId), centerFamilies).length;
      const metricBadges = result ? `<span class="mini-badge ${result.classification === "Decentralized" ? "good" : "bad"}">${esc(result.classification)}</span><span class="mini-badge ${result.distribution === "Distributed" ? "good" : "warn"}">${esc(result.distribution)}</span><span class="mini-badge">µ=${result.mu}</span><span class="mini-badge">d⃗=[${fmt(result.tl)}, ${fmt(result.il)}]</span>` : `<span class="mini-badge">µ=${previewMu}</span><span class="mini-badge">λ=${entries.length}</span><span class="mini-badge">δ=${esc(item.delta)}</span>`;
      return `<section class="subject-card ${cardInvalid ? "invalid" : ""} ${state.assignSubjectId === item.id ? "active-assignment" : ""}" style="--subject-color:${esc(item.color)}" data-subject-card="${esc(item.id)}">
        <div class="subject-card-head"><div class="subject-name-wrap"><input class="subject-color" data-field="color" data-subject="${esc(item.id)}" type="color" value="${esc(item.color)}" aria-label="Subject color"><input class="subject-name" data-field="name" data-subject="${esc(item.id)}" value="${esc(item.name)}" aria-label="Subject name"></div><div class="subject-actions"><button class="mini-btn ${state.assignSubjectId === item.id ? "active" : ""}" data-action="assign-canvas" data-subject="${esc(item.id)}" type="button">${state.assignSubjectId === item.id ? "Stop assigning" : "Assign on canvas"}</button><button class="mini-btn remove" data-action="remove-subject" data-subject="${esc(item.id)}" type="button">Delete</button></div></div>
        <div class="subject-fields"><label>Anchor a<select data-field="anchorId" data-subject="${esc(item.id)}">${anchorOptions}</select></label><label>Realization multiplicity δ(p)<input data-field="delta" data-subject="${esc(item.id)}" type="number" min="1" step="1" value="${esc(item.delta)}"></label><label>Pair weight factor ε<input data-field="epsilon" data-subject="${esc(item.id)}" type="number" min="0.01" step="0.05" value="${esc(item.epsilon)}"></label><div class="metric-preview">${metricBadges}</div></div>
        <div class="realization-editor"><div class="realization-title"><strong>realizedAt counts</strong><span class="sum-chip ${sum === Number(item.delta) ? "good" : "bad"}">${sum}/${esc(item.delta)} realizations</span></div><div class="realization-columns compact-columns" aria-hidden="true"><span>Vertex</span><span>Count</span><span>Reached center(s)</span><span></span></div><div class="realization-list">${rows || `<div class="realization-empty">No subject-supporting vertices assigned.</div>`}</div><div class="realization-actions"><button class="mini-btn" data-action="add-realization" data-subject="${esc(item.id)}" type="button">+ Supporting vertex</button><button class="mini-btn" data-action="balance-realizations" data-subject="${esc(item.id)}" type="button">Balance counts</button><button class="mini-btn" data-action="manage-centers" data-anchor-id="${esc(anchor?.id||"")}" type="button">Edit ${esc(anchor?.name||"anchor")} centers</button></div><small class="center-help">Center membership is defined once for ${esc(anchor?.name||"the selected anchor")} and reused by every subject paired with it.</small></div>
      </section>`;
    }).join("");
  }

  function renderValidation() {
    const validation = validateModel();
    const panel = $("#validationPanel");
    const list = $("#validationList");
    panel.classList.toggle("valid", validation.valid);
    panel.classList.toggle("invalid", !validation.valid);
    const issues = [...validation.errors.map(text => ({text, cls:"error"})), ...validation.warnings.map(text => ({text, cls:"warning"}))];
    const displayed = issues.length ? issues : validation.ok.map(text => ({text, cls:"ok"}));
    list.innerHTML = displayed.map(item => `<li class="${item.cls}">${esc(item.text)}</li>`).join("");
    $("#validationCount").textContent = validation.valid ? (validation.warnings.length ? `${validation.warnings.length} warning${validation.warnings.length === 1 ? "" : "s"}` : "Ready") : `${validation.errors.length} blocking`;
    $("#evaluationReadiness").textContent = validation.valid ? (validation.warnings.length ? "Inputs are valid; warnings will be disclosed in the report." : "All ontology and graph checks passed.") : "Resolve input errors to evaluate.";
    $("#evaluateBtn").disabled = !validation.valid || state.benchmark?.passed === false;
    $("#evaluatePanelBtn").disabled = !validation.valid || state.benchmark?.passed === false;
    const status = $("#headerStatus");
    status.className = `status-pill ${validation.valid ? "good" : "bad"}`;
    status.textContent = validation.valid ? (validation.warnings.length ? "Valid · warnings" : "Inputs valid") : `${validation.errors.length} input issue${validation.errors.length === 1 ? "" : "s"}`;
  }

  function updateExampleNote() {
    const key = $("#exampleSelect").value;
    $("#exampleNote").textContent = EXAMPLES[key]?.note || "";
  }

  function setTool(tool, render = true) {
    state.tool = tool;
    if (tool !== "edge") state.edgeStart = null;
    if (tool !== "assign") state.assignSubjectId = null;
    if (tool !== "center") state.assignCenter = null;
    $$(".tool[data-tool]").forEach(button => {
      const active = button.dataset.tool === tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const hints = {
      select: "Drag vertices to arrange · Wheel to zoom · Drag empty space to pan",
      vertex: "Click empty canvas space to add a vertex",
      edge: state.edgeStart ? `Choose a second vertex to connect from ${state.edgeStart}` : "Choose two vertices to add a connection",
      delete: "Click a vertex or connection to remove it (Undo is available)",
      assign: "Click vertices to toggle locations for the active subject",
      center: "Click vertices to toggle membership in the active center; vertices may belong to more than one center"
    };
    $("#canvasHint").textContent = hints[tool] || hints.select;
    if (render) { renderGraph(); renderSubjects(); }
  }

  function addVertex(x, y) {
    pushHistory();
    const used = new Set(state.graph.nodes.map(node => node.id));
    let index = state.graph.nodes.length + 1;
    while (used.has(`v${index}`)) index++;
    const id = `v${index}`;
    state.graph.nodes.push({id, label:id, x, y});
    state.selected = {type:"node", id};
    invalidateEvaluation();
    refreshWorkspace();
    toast(`Added vertex ${id}.`);
  }

  function removeVertex(id) {
    const node = state.graph.nodes.find(item => item.id === id);
    if (!node) return;
    pushHistory();
    state.graph.nodes = state.graph.nodes.filter(item => item.id !== id);
    state.graph.edges = state.graph.edges.filter(edge => edge.a !== id && edge.b !== id);
    for (const item of state.subjects) {
      delete item.realizations[id];
    }
    for(const anchor of state.anchors)for(const region of anchor.regions||[])region.vertices=region.vertices.filter(vertexId=>vertexId!==id);
    if (state.selected?.id === id) state.selected = null;
    if (state.edgeStart === id) state.edgeStart = null;
    invalidateEvaluation();
    refreshWorkspace();
    toast(`Removed ${node.label || id} and its incident assignments. Undo is available.`, "warning");
  }

  function addEdge(a, b) {
    if (a === b) { toast("A simple graph cannot contain a self-loop.", "error"); return; }
    if (state.graph.edges.some(edge => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a))) {
      toast("That connection already exists.", "warning");
      return;
    }
    pushHistory();
    const id = `e${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    state.graph.edges.push({id, a, b});
    state.edgeStart = null;
    state.selected = {type:"edge", id};
    invalidateEvaluation();
    refreshWorkspace();
    setTool("edge");
  }

  function removeEdge(id) {
    const edge = state.graph.edges.find(item => item.id === id);
    if (!edge) return;
    pushHistory();
    state.graph.edges = state.graph.edges.filter(item => item.id !== id);
    if (state.selected?.id === id) state.selected = null;
    invalidateEvaluation();
    refreshWorkspace();
    toast(`Removed connection ${edge.a}–${edge.b}.`);
  }

  function toggleSubjectVertex(subjectId, vertexId) {
    const item = state.subjects.find(subject => subject.id === subjectId);
    if (!item) return;
    pushHistory();
    if (item.realizations[vertexId]) {
      delete item.realizations[vertexId];
    }
    else {
      const assigned = Object.values(item.realizations).reduce((sum, count) => sum + Number(count), 0);
      if (assigned >= Number(item.delta)) {
        state.history.pop();
        updateHistoryButtons();
        toast(`All ${item.delta} realizations are already assigned. Increase δ or free a location first.`, "warning");
        return;
      }
      item.realizations[vertexId] = 1;
    }
    invalidateEvaluation();
    refreshWorkspace();
  }

  function addSubject() {
    pushHistory();
    const anchor=ensureActiveAnchor();
    const id = `subject-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`;
    const first = state.graph.nodes[0]?.id;
    state.subjects.push({id, name:`Subject ${state.subjects.length + 1}`, anchorId:anchor.id, anchor:anchor.name, delta:1, epsilon:1, color:SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length], realizations:first ? {[first]:1} : {}});
    invalidateEvaluation();
    syncSimulationTemplates(false);
    refreshWorkspace();
  }

  function removeSubject(id) {
    const item = state.subjects.find(subject => subject.id === id);
    if (!item) return;
    pushHistory();
    state.subjects = state.subjects.filter(subject => subject.id !== id);
    if (state.assignSubjectId === id) setTool("select", false);
    invalidateEvaluation();
    syncSimulationTemplates(false);
    refreshWorkspace();
    toast(`Removed ${profileEntryLabel(item.name, subjectAnchorName(item))}.`);
  }

  function addRealizationLocation(subjectId) {
    const item = state.subjects.find(subject => subject.id === subjectId);
    if (!item) return;
    const vertex = state.graph.nodes.find(node => !Object.prototype.hasOwnProperty.call(item.realizations, node.id));
    if (!vertex) { toast("Every canvas vertex is already used by this subject.", "warning"); return; }
    pushHistory();
    item.realizations[vertex.id] = 1;
    invalidateEvaluation();
    refreshWorkspace();
  }

  function balanceRealizations(subjectId) {
    const item = state.subjects.find(subject => subject.id === subjectId);
    if (!item) return;
    const keys = Object.keys(item.realizations);
    if (!keys.length) { toast("Add at least one realization location first.", "warning"); return; }
    if (Number(item.delta) < keys.length) { toast("δ must be at least λ before counts can be balanced.", "warning"); return; }
    pushHistory();
    const base = Math.floor(Number(item.delta) / keys.length);
    let remainder = Number(item.delta) % keys.length;
    keys.forEach(key => { item.realizations[key] = base + (remainder-- > 0 ? 1 : 0); });
    invalidateEvaluation();
    refreshWorkspace();
  }

  function renameVertexId(oldId, newId) {
    newId = String(newId).trim();
    if (!newId || oldId === newId) return;
    if (state.graph.nodes.some(node => node.id === newId)) { toast("Vertex identifiers must be unique.", "error"); return; }
    pushHistory();
    const node = state.graph.nodes.find(item => item.id === oldId);
    if (!node) return;
    node.id = newId;
    for (const edge of state.graph.edges) {
      if (edge.a === oldId) edge.a = newId;
      if (edge.b === oldId) edge.b = newId;
    }
    for (const item of state.subjects) {
      if (Object.prototype.hasOwnProperty.call(item.realizations, oldId)) {
        item.realizations[newId] = item.realizations[oldId];
        delete item.realizations[oldId];
      }
    }
    for(const anchor of state.anchors)for(const region of anchor.regions||[])region.vertices=region.vertices.map(vertexId=>vertexId===oldId?newId:vertexId);
    state.selected = {type:"node", id:newId};
    invalidateEvaluation();
    refreshWorkspace();
  }

  function canvasPoint(event) {
    const svg = $("#graphCanvas");
    const rect = svg.getBoundingClientRect();
    return {
      x: state.viewBox.x + ((event.clientX - rect.left) / rect.width) * state.viewBox.w,
      y: state.viewBox.y + ((event.clientY - rect.top) / rect.height) * state.viewBox.h
    };
  }

  function handleCanvasPointerDown(event) {
    const nodeEl = event.target.closest(".node");
    const edgeEl = event.target.closest(".edge");
    if (nodeEl) {
      const id = nodeEl.dataset.nodeId;
      if (state.tool === "delete") return removeVertex(id);
      if (state.tool === "edge") {
        if (!state.edgeStart) { state.edgeStart = id; setTool("edge"); }
        else if (state.edgeStart === id) { state.edgeStart = null; setTool("edge"); }
        else addEdge(state.edgeStart, id);
        return;
      }
      if (state.tool === "assign") return toggleSubjectVertex(state.assignSubjectId, id);
      if (state.tool === "center") return toggleCenterVertex(state.assignCenter?.anchorId,state.assignCenter?.regionId,id);
      if (state.tool !== "select") return;
      const node = state.graph.nodes.find(item => item.id === id);
      state.selected = {type:"node", id};
      state.drag = {kind:"node", id, pointerId:event.pointerId, start:canvasPoint(event), origin:{x:node.x,y:node.y}, before:captureModel(), moved:false};
      event.currentTarget.setPointerCapture?.(event.pointerId);
      renderGraph();
      renderSelectionInspector();
      return;
    }
    if (edgeEl) {
      const id = edgeEl.dataset.edgeId;
      if (state.tool === "delete") return removeEdge(id);
      if (state.tool === "select") {
        state.selected = {type:"edge", id};
        renderGraph(); renderSelectionInspector();
      }
      return;
    }
    if (state.tool === "vertex") {
      const point = canvasPoint(event);
      return addVertex(point.x, point.y);
    }
    if (state.tool === "select") {
      state.selected = null;
      state.drag = {kind:"pan", pointerId:event.pointerId, startClient:{x:event.clientX,y:event.clientY}, origin:clone(state.viewBox), moved:false};
      event.currentTarget.setPointerCapture?.(event.pointerId);
      renderGraph(); renderSelectionInspector();
    }
  }

  function handleCanvasPointerMove(event) {
    const drag = state.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.kind === "node") {
      const node = state.graph.nodes.find(item => item.id === drag.id);
      if (!node) return;
      const point = canvasPoint(event);
      node.x = drag.origin.x + (point.x - drag.start.x);
      node.y = drag.origin.y + (point.y - drag.start.y);
      drag.moved = drag.moved || Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > 1;
      renderGraph();
    } else if (drag.kind === "pan") {
      const svg = $("#graphCanvas");
      const rect = svg.getBoundingClientRect();
      const dx = (event.clientX - drag.startClient.x) / rect.width * drag.origin.w;
      const dy = (event.clientY - drag.startClient.y) / rect.height * drag.origin.h;
      state.viewBox.x = drag.origin.x - dx;
      state.viewBox.y = drag.origin.y - dy;
      drag.moved = drag.moved || Math.hypot(dx,dy) > 1;
      svg.setAttribute("viewBox", `${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.w} ${state.viewBox.h}`);
    }
  }

  function handleCanvasPointerUp(event) {
    const drag = state.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.kind === "node" && drag.moved) {
      pushHistory(drag.before);
      invalidateEvaluation();
      refreshWorkspace({subjects:false});
    }
    state.drag = null;
  }

  function handleCanvasWheel(event) {
    event.preventDefault();
    const point = canvasPoint(event);
    const factor = event.deltaY > 0 ? 1.12 : .89;
    const newW = clamp(state.viewBox.w * factor, 150, 6000);
    const newH = newW;
    const rx = (point.x - state.viewBox.x) / state.viewBox.w;
    const ry = (point.y - state.viewBox.y) / state.viewBox.h;
    state.viewBox.x = point.x - rx * newW;
    state.viewBox.y = point.y - ry * newH;
    state.viewBox.w = newW;
    state.viewBox.h = newH;
    $("#graphCanvas").setAttribute("viewBox", `${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.w} ${state.viewBox.h}`);
  }

  function fitGraph() {
    if (!state.graph.nodes.length) { state.viewBox = {x:0,y:0,w:PLANE_SIZE,h:PLANE_SIZE}; return renderGraph(); }
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const node of state.graph.nodes){minX=Math.min(minX,node.x);maxX=Math.max(maxX,node.x);minY=Math.min(minY,node.y);maxY=Math.max(maxY,node.y);}
    const size = Math.max(180, maxX - minX + 130, maxY - minY + 130);
    state.viewBox = {x:(minX+maxX)/2-size/2, y:(minY+maxY)/2-size/2, w:size, h:size};
    renderGraph();
  }

  function applyLayout(type) {
    const n = state.graph.nodes.length;
    if (!n) return;
    pushHistory();
    if (type === "grid") {
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      state.graph.nodes.forEach((node,i) => { node.x = PLANE_PAD + (i % cols) * ((PLANE_SIZE-PLANE_PAD*2) / Math.max(1, cols - 1)); node.y = PLANE_PAD + Math.floor(i / cols) * ((PLANE_SIZE-PLANE_PAD*2) / Math.max(1, rows-1)); });
    } else if (type === "radial") {
      const degree = new Map(state.graph.nodes.map(node => [node.id,0]));
      state.graph.edges.forEach(edge => { degree.set(edge.a,(degree.get(edge.a)||0)+1); degree.set(edge.b,(degree.get(edge.b)||0)+1); });
      const sorted = [...state.graph.nodes].sort((a,b) => degree.get(b.id)-degree.get(a.id));
      sorted.forEach((node,i) => { const ring = Math.floor(Math.sqrt(i)); const inRing = Math.max(1,2*ring+1); const angle = (i-ring*ring)/inRing*Math.PI*2; const r=ring*45; node.x=PLANE_CENTER+Math.cos(angle)*r; node.y=PLANE_CENTER+Math.sin(angle)*r; });
    } else if (type === "force" && n <= 900) {
      forceLayout(state.graph);
    } else {
      state.graph.nodes.forEach((node,i) => { const angle = -Math.PI/2 + i/n*Math.PI*2; const r = Math.min(PLANE_CENTER-PLANE_PAD, 90 + n*3); node.x=PLANE_CENTER+Math.cos(angle)*r; node.y=PLANE_CENTER+Math.sin(angle)*r; });
      if (type === "force" && n > 900) toast("Force layout is capped at 900 vertices; a circle layout was applied.", "warning");
    }
    invalidateEvaluation();
    fitGraph();
    refreshWorkspace({subjects:false});
  }

  function forceLayout(graph) {
    const n = graph.nodes.length;
    if (!n) return;
    const index = new Map(graph.nodes.map((node,i) => [node.id,i]));
    const width=PLANE_SIZE-PLANE_PAD*2,height=width,k=Math.sqrt(width*height/n);
    graph.nodes.forEach((node,i) => { if (!Number.isFinite(node.x)) node.x=70+(i%10)*70; if (!Number.isFinite(node.y)) node.y=70+Math.floor(i/10)*55; });
    const iterations = n < 150 ? 100 : n < 400 ? 50 : 24;
    for (let iter=0; iter<iterations; iter++) {
      const dx=new Float64Array(n),dy=new Float64Array(n);
      const stride = n > 350 ? Math.ceil(n/350) : 1;
      for (let i=0;i<n;i++) for (let j=i+stride;j<n;j+=stride) {
        let vx=graph.nodes[i].x-graph.nodes[j].x,vy=graph.nodes[i].y-graph.nodes[j].y;
        let d=Math.max(2,Math.hypot(vx,vy)),f=k*k/d;
        vx=vx/d*f;vy=vy/d*f;dx[i]+=vx;dy[i]+=vy;dx[j]-=vx;dy[j]-=vy;
      }
      for (const edge of graph.edges) {
        const i=index.get(edge.a),j=index.get(edge.b); if(i==null||j==null)continue;
        let vx=graph.nodes[i].x-graph.nodes[j].x,vy=graph.nodes[i].y-graph.nodes[j].y,d=Math.max(2,Math.hypot(vx,vy)),f=d*d/k;
        vx=vx/d*f;vy=vy/d*f;dx[i]-=vx;dy[i]-=vy;dx[j]+=vx;dy[j]+=vy;
      }
      const temp=35*(1-iter/iterations)+2;
      graph.nodes.forEach((node,i)=>{ const d=Math.max(1,Math.hypot(dx[i],dy[i])); node.x=clamp(node.x+dx[i]/d*Math.min(d,temp),PLANE_PAD,PLANE_SIZE-PLANE_PAD); node.y=clamp(node.y+dy[i]/d*Math.min(d,temp),PLANE_PAD,PLANE_SIZE-PLANE_PAD); });
    }
  }

  function handleSubjectListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const {action, subject:subjectId, vertex} = button.dataset;
    if (action === "add-subject") return addSubject();
    if (action === "remove-subject") return removeSubject(subjectId);
    if (action === "add-realization") return addRealizationLocation(subjectId);
    if (action === "remove-realization") {
      const item = state.subjects.find(subject => subject.id === subjectId);
      if (!item) return;
      pushHistory(); delete item.realizations[vertex]; invalidateEvaluation(); refreshWorkspace(); return;
    }
    if (action === "balance-realizations") return balanceRealizations(subjectId);
    if (action === "assign-canvas") {
      if (state.assignSubjectId === subjectId) setTool("select");
      else { state.assignSubjectId = subjectId; setTool("assign"); }
    }
    if(action==="manage-centers"){
      state.activeAnchorId=button.dataset.anchorId;state.editorPane="anchors";renderAnchors();renderEditorPane();
    }
  }

  function handleSubjectFieldInput(event) {
    const target = event.target.closest("[data-field][data-subject]");
    if (!target) return;
    const item = state.subjects.find(subject => subject.id === target.dataset.subject);
    if (!item) return;
    const field = target.dataset.field;
    if (field === "name") item.name = target.value;
    else if (field === "anchorId") {const anchor=getAnchor(target.value);item.anchorId=target.value;item.anchor=anchor?.name||item.anchor;state.activeAnchorId=target.value;}
    else if (field === "delta") item.delta = Number(target.value);
    else if (field === "epsilon") item.epsilon = Number(target.value);
    else if (field === "color") item.color = target.value;
    else if (field === "realization-count") item.realizations[target.dataset.vertex] = Number(target.value);
    renderValidation();
    if (field === "color" || field === "name" || field === "anchorId") { renderGraph(); renderLegend(); renderCanvasAnchorBar(); }
  }

  function handleSubjectFieldChange(event) {
    const target = event.target.closest("[data-field][data-subject]");
    if (!target) return;
    const item = state.subjects.find(subject => subject.id === target.dataset.subject);
    if (!item) return;
    if (target.dataset.field === "realization-vertex") {
      const row = target.closest(".realization-row");
      const oldVertex = row.dataset.vertex;
      const newVertex = target.value;
      if (oldVertex !== newVertex && Object.prototype.hasOwnProperty.call(item.realizations, newVertex)) {
        toast("That vertex is already a location for this subject.", "warning");
      } else if (oldVertex !== newVertex) {
        item.realizations[newVertex] = item.realizations[oldVertex];
        delete item.realizations[oldVertex];
      }
    }
    if (state.fieldSnapshot) pushHistory(state.fieldSnapshot);
    state.fieldSnapshot = null;
    invalidateEvaluation();
    syncSimulationTemplates(false);
    refreshWorkspace();
  }

  async function importFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseTopologyFile(file.name, text);
      const validation = validateImportedGraph(parsed.graph);
      if (validation.length) throw new Error(validation.join(" "));
      pushHistory();
      state.graph = parsed.graph;
      if (parsed.subjects) {
        const model=normalizeModelAnchors(state.graph,parsed.subjects,parsed.anchors||null);
        state.subjects=model.subjects;state.anchors=model.anchors;
      }
      else {
        state.subjects = state.subjects.map(item => ({...item, realizations:{}}));
        state.anchors = state.anchors.map(anchor=>({...anchor,regions:[]}));
      }
      state.activeAnchorId=state.anchors[0]?.id||null;state.assignCenter=null;
      state.selected = null;
      state.viewBox = {x:0,y:0,w:PLANE_SIZE,h:PLANE_SIZE};
      if (!state.graph.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y))) applyDefaultCoordinates(state.graph.nodes);
      invalidateEvaluation();
      syncSimulationTemplates(false);
      refreshWorkspace();
      fitGraph();
      toast(`Uploaded ${file.name}: ${state.graph.nodes.length} vertices and ${state.graph.edges.length} connections.`);
    } catch (error) {
      toast(`Upload failed: ${error.message}`, "error", 7000);
    } finally {
      $("#fileInput").value = "";
    }
  }

  function parseTopologyFile(filename, text) {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".json")) return parseJsonTopology(text);
    if (lower.endsWith(".graphml") || lower.endsWith(".xml")) return parseGraphML(text);
    return parseEdgeList(text, lower.endsWith(".tsv") ? "\t" : null);
  }

  function parseJsonTopology(text) {
    const data = JSON.parse(text);
    const root = data.graph || data;
    let rawNodes = root.nodes;
    let rawEdges = root.edges;
    if (!rawNodes && Array.isArray(root.adjacency)) {
      const labels = root.labels || root.adjacency.map((_,i) => `v${i+1}`);
      rawNodes = labels;
      rawEdges = [];
      root.adjacency.forEach((row,i) => row.forEach((value,j) => { if (j > i && Number(value)) rawEdges.push([labels[i],labels[j]]); }));
    }
    if (!Array.isArray(rawNodes) || !Array.isArray(rawEdges)) throw new Error("JSON requires nodes and edges arrays, or an adjacency matrix.");
    const nodes = rawNodes.map((node,i) => typeof node === "string" || typeof node === "number" ? {id:String(node),label:String(node),x:NaN,y:NaN} : {id:String(node.id ?? node.name ?? `v${i+1}`),label:String(node.label ?? node.name ?? node.id ?? `v${i+1}`),x:Number(node.x),y:Number(node.y)});
    const edges = rawEdges.map((edge,i) => {
      const a = Array.isArray(edge) ? edge[0] : edge.a ?? edge.source ?? edge.from;
      const b = Array.isArray(edge) ? edge[1] : edge.b ?? edge.target ?? edge.to;
      return {id:String(edge.id ?? `e${i+1}`),a:String(a),b:String(b)};
    });
    applyDefaultCoordinates(nodes);
    const subjects = Array.isArray(data.subjects) ? data.subjects.map((item,i) => ({
      id:String(item.id ?? `subject-${i+1}`),
      name:String(item.name ?? `Subject ${i+1}`),
      anchorId:String(item.anchorId ?? ""),
      anchor:String(item.anchor ?? item.anchorName ?? "Unspecified anchor"),
      delta:Number(item.delta ?? item.projectionCount ?? 1),
      epsilon:Number(item.epsilon ?? 1),
      color:String(item.color ?? SUBJECT_COLORS[i % SUBJECT_COLORS.length]),
      realizations: normalizeRealizations(item.realizations ?? item.vertices ?? {}),
      centers: normalizeCenters(item.centers ?? item.centerRegions ?? {})
    })) : null;
    const anchors=Array.isArray(data.anchors)?clone(data.anchors):null;
    return {graph:{nodes,edges}, subjects, anchors};
  }

  function normalizeRealizations(value) {
    if (Array.isArray(value)) {
      const result = {};
      value.forEach(entry => {
        if (typeof entry === "string" || typeof entry === "number") result[String(entry)] = (result[String(entry)] || 0) + 1;
        else if (entry && entry.vertex != null) result[String(entry.vertex)] = Number(entry.count ?? 1);
      });
      return result;
    }
    return Object.fromEntries(Object.entries(value || {}).map(([key,count]) => [String(key),Number(count)]));
  }

  function normalizeCenters(value) {
    return Object.fromEntries(Object.entries(value || {}).map(([vertexId, labels]) => [String(vertexId), Array.isArray(labels) ? labels.map(String).join(", ") : String(labels || "")]));
  }

  function parseGraphML(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("The GraphML/XML document is not well formed.");
    const nodeElements = Array.from(doc.getElementsByTagNameNS("*", "node"));
    const edgeElements = Array.from(doc.getElementsByTagNameNS("*", "edge"));
    const nodes = nodeElements.map((element,i) => {
      const id = element.getAttribute("id") || `v${i+1}`;
      const dataTexts = Array.from(element.getElementsByTagNameNS("*", "data")).map(item => item.textContent.trim()).filter(Boolean);
      return {id,label:dataTexts[0] || id,x:NaN,y:NaN};
    });
    const edges = edgeElements.map((element,i) => ({id:element.getAttribute("id") || `e${i+1}`,a:element.getAttribute("source"),b:element.getAttribute("target")}));
    applyDefaultCoordinates(nodes);
    return {graph:{nodes,edges},subjects:null};
  }

  function parseEdgeList(text, forcedDelimiter = null) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#") && !line.startsWith("//"));
    if (!lines.length) throw new Error("The edge-list file is empty.");
    const detect = forcedDelimiter || (lines[0].includes("\t") ? "\t" : lines[0].includes(",") ? "," : null);
    const rows = lines.map(line => detect ? splitDelimitedLine(line, detect) : line.split(/\s+/));
    const header = rows[0].map(value => value.toLowerCase());
    const hasHeader = header.includes("source") || header.includes("target") || header.includes("from") || header.includes("to");
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const pairs = dataRows.map(row => [String(row[0] ?? "").trim(),String(row[1] ?? "").trim()]).filter(([a,b]) => a && b);
    if (!pairs.length) throw new Error("No source-target pairs were found.");
    const ids = [];
    const seen = new Set();
    pairs.flat().forEach(id => { if (!seen.has(id)) { seen.add(id); ids.push(id); } });
    const nodes = ids.map(id => ({id,label:id,x:NaN,y:NaN}));
    applyDefaultCoordinates(nodes);
    return {graph:{nodes,edges:edgeObjects(pairs)},subjects:null};
  }

  function splitDelimitedLine(line, delimiter) {
    const result = [];
    let current = "", quoted = false;
    for (let i=0;i<line.length;i++) {
      const char=line[i];
      if (char === '"') {
        if (quoted && line[i+1] === '"') { current+='"'; i++; }
        else quoted=!quoted;
      } else if (char === delimiter && !quoted) { result.push(current.trim()); current=""; }
      else current+=char;
    }
    result.push(current.trim());
    return result;
  }

  function applyDefaultCoordinates(nodes) {
    const n = nodes.length;
    nodes.forEach((node,i) => {
      if (Number.isFinite(node.x) && Number.isFinite(node.y)) return;
      const angle=-Math.PI/2+(i/Math.max(1,n))*Math.PI*2;
      const radius=Math.min(245,100+n*2.5);
      node.x=PLANE_CENTER+Math.cos(angle)*radius;
      node.y=PLANE_CENTER+Math.sin(angle)*radius;
    });
  }

  function validateImportedGraph(graph) {
    const errors=[];
    const ids=graph.nodes.map(node=>node.id);
    const set=new Set(ids);
    if (!ids.length) errors.push("No vertices were found.");
    if (set.size!==ids.length) errors.push("Vertex identifiers are duplicated.");
    const pairs=new Set();
    graph.edges.forEach(edge=>{
      if(!set.has(edge.a)||!set.has(edge.b)) errors.push(`Edge ${edge.a}–${edge.b} references a missing vertex.`);
      if(edge.a===edge.b) errors.push(`Self-loop ${edge.a}–${edge.b} is not supported.`);
      const key=[edge.a,edge.b].sort().join("\u0000");
      if(pairs.has(key)) errors.push(`Duplicate edge ${edge.a}–${edge.b}.`);
      pairs.add(key);
    });
    return [...new Set(errors)].slice(0,20);
  }

  function exportSnapshot() {
    const payload = {
      schema: "decentralization-ontology-sandbox/v3",
      exportedAt: nowIso(),
      source: PAPER_CITATION,
      graph: clone(state.graph),
      anchors: clone(state.anchors),
      subjects: clone(state.subjects)
    };
    downloadBlob("decentralization-system-snapshot.json", JSON.stringify(payload,null,2), "application/json");
  }

  function downloadBlob(filename, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href=url; anchor.download=filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
