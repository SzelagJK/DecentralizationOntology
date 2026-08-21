"use strict";
  function batchEvaluations() {
    return state.simulation.results;
  }

  function getSelectedEvaluation() {
    const evaluations=batchEvaluations();
    return evaluations.find(item=>item.id===state.results.selectedSystem)||evaluations[0]||null;
  }

  function evaluationsForResultScope() {
    const scope=$("#resultScope")?.value||"all",selected=getSelectedEvaluation();let systems=batchEvaluations();
    if(scope==="selected")systems=selected?[selected]:[];
    return systems;
  }

  function ensureResultSubjectFilters() {
    const nameSet=new Set();
    for(const system of batchEvaluations())for(const item of system.subjects)nameSet.add(item.name);
    const names=[...nameSet];
    names.forEach(name=>{if(!(name in state.results.subjectEnabled))state.results.subjectEnabled[name]=true;});
    for(const key of Object.keys(state.results.subjectEnabled))if(!nameSet.has(key))delete state.results.subjectEnabled[key];
    const host=$("#resultSubjectFilters");
    host.innerHTML=names.map(name=>`<label class="check-label"><input type="checkbox" data-result-subject="${esc(name)}" ${state.results.subjectEnabled[name]!==false?"checked":""}><span>${esc(name)}</span></label>`).join("")||'<span class="muted">No profile entries</span>';
  }

  function resultRecords() {
    const systems=evaluationsForResultScope();
    const records=[];
    const showSubjects=$("#showSubjects")?.checked!==false,showAggregate=$("#showAggregate")?.checked!==false,classFilter=$("#classFilter")?.value||"all";
    for(const system of systems){
      if(showSubjects)for(const item of system.subjects){
        if(state.results.subjectEnabled[item.name]===false)continue;
        if(classFilter!=="all"&&item.classification!==classFilter)continue;
        records.push({kind:"subject",id:item.id,name:item.name,subjectName:item.subjectName,anchor:item.anchor,color:item.color,tl:item.tl,il:item.il,length:item.length,classification:item.classification,distribution:item.distribution,delta:item.delta,lambda:item.lambda,mu:item.mu,coverage:item.coverage,dispersion:item.dispersion,colocated:item.colocated,rv:item.rv,gs:item.gs,re:item.re,epsilon:item.epsilon,systemId:system.id,systemName:system.name,systemSource:system.source,systemClass:system.systemClass,systemDistribution:system.systemDistribution,n:system.n,m:system.m});
      }
      if(showAggregate&&classFilter==="all")records.push({kind:"aggregate",id:"aggregate",name:"Aggregate A(Eₛ)",color:"#282a35",systemId:system.id,systemName:system.name,systemSource:system.source,systemClass:system.systemClass,systemDistribution:system.systemDistribution,classification:system.systemClass,distribution:system.systemDistribution,n:system.n,m:system.m,tl:system.aggregate.tl,il:system.aggregate.il,length:system.aggregate.length,coverage:system.distributionProfile.meanCoverage,dispersion:system.distributionProfile.meanDispersion,unionCoverage:system.distributionProfile.unionCoverage,delta:null,lambda:null,mu:null,colocated:system.distributionProfile.colocatedRealizations,rv:null,gs:null,re:null,epsilon:null});
    }
    return records;
  }

  function drawCompactVectorPlane(canvas,records,pointTarget,title) {
    if(!canvas)return;
    const rect=canvas.getBoundingClientRect(),w=Math.max(360,rect.width||760),h=Math.max(330,parseFloat(getComputedStyle(canvas).height)||440),dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);
    const plot=squarePlot(w,h,{left:50,right:14,top:14,bottom:44}),size=plot.size,ticks=[0,.5,1];
    ctx.font="10px Inter, sans-serif";ctx.strokeStyle="#e0e4e7";ctx.lineWidth=1;
    for(const value of ticks){const x=plot.left+value*size,y=plot.top+(1-value)*size;ctx.beginPath();ctx.moveTo(x,plot.top);ctx.lineTo(x,plot.top+size);ctx.stroke();ctx.beginPath();ctx.moveTo(plot.left,y);ctx.lineTo(plot.left+size,y);ctx.stroke();ctx.fillStyle="#69757e";ctx.textAlign="center";ctx.fillText(fmt(value,1),x,plot.top+size+18);ctx.textAlign="right";ctx.fillText(fmt(value,1),plot.left-9,y);}
    ctx.strokeStyle="#303942";ctx.lineWidth=1.4;ctx.strokeRect(plot.left,plot.top,size,size);ctx.fillStyle="#344049";ctx.font="700 12px Inter, sans-serif";ctx.textAlign="center";ctx.fillText("Tₗ",plot.left+size/2,plot.top+size+40);ctx.fillText("Iₗ",plot.left-38,plot.top+size/2);
    pointTarget.length=0;
    records.forEach((record,index)=>{const x=plot.left+clamp(record.tl,0,1)*size,y=plot.top+(1-clamp(record.il,0,1))*size,color=record.color||SUBJECT_COLORS[index%SUBJECT_COLORS.length],aggregate=record.kind==="aggregate";ctx.strokeStyle=hexAlpha(color,aggregate?.34:.16);ctx.lineWidth=aggregate?1.6:1;ctx.beginPath();ctx.moveTo(plot.left,plot.top+size);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle=color;ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();if(aggregate){ctx.moveTo(x,y-8);ctx.lineTo(x+8,y);ctx.lineTo(x,y+8);ctx.lineTo(x-8,y);ctx.closePath();}else ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.stroke();pointTarget.push({x,y,r:aggregate?10:8,record});});
    canvas.setAttribute("aria-label",`${title}: ${records.length} analytical vectors on a square plane`);
  }

  function compactVectorRecords(system,aggregateOnly=false) {
    const records=aggregateOnly?[]:system.subjects.map(item=>({kind:"subject",name:item.name,tl:item.tl,il:item.il,length:item.length,color:item.color,classification:item.classification,distribution:item.distribution,systemName:system.name}));
    records.push({kind:"aggregate",name:"Aggregate A(Eₛ)",tl:system.aggregate.tl,il:system.aggregate.il,length:system.aggregate.length,color:"#282a35",classification:system.systemClass,distribution:system.systemDistribution,systemName:system.name});
    return records;
  }

  function renderSingleResults() {
    const system=state.currentEvaluation,empty=$("#emptySingleResults"),content=$("#singleResultsContent");if(!empty||!content)return;
    empty.classList.toggle("hidden",Boolean(system));content.classList.toggle("hidden",!system);if(!system)return;
    $("#singleSummary").innerHTML=`<div class="compact-stat"><small>Ontology</small><strong>${esc(system.systemClass)}</strong><span>dim=${system.dimensionality}/${system.subjectCount} declared pairs</span></div><div class="compact-stat"><small>Aggregate A(Eₛ)</small><strong>[${fmt(system.aggregate.tl)}, ${fmt(system.aggregate.il)}]</strong><span>Equal element-wise profile mean</span></div><div class="compact-stat"><small>Vector length</small><strong>${fmt(system.aggregate.length)}</strong><span>Euclidean L2 · maximum √2</span></div>`;
    $("#singleResultsTableBody").innerHTML=system.subjects.map(item=>`<tr><td><i class="table-dot" style="background:${esc(item.color)}"></i>${esc(item.name)}</td><td class="vector-cell">[${fmt(item.tl)}, ${fmt(item.il)}]</td><td>${fmt(item.length)}</td><td><span class="row-badge ${item.classification==="Decentralized"?"decentral":"central"}">${esc(item.classification)}</span></td><td>${esc(item.distribution)}</td><td>${item.delta}</td><td>${item.lambda}</td><td>${item.mu}</td></tr>`).join("");
    $("#singleTableCount").textContent=`${system.subjectCount} profile entr${system.subjectCount===1?"y":"ies"}`;
    const records=compactVectorRecords(system);drawCompactVectorPlane($("#singleVectorChart"),records,state.single.chartPoints,system.name);
    $("#singleChartLegend").innerHTML=records.slice(0,9).map(item=>`<span class="legend-item"><i class="legend-swatch" style="background:${esc(item.color)}"></i>${esc(item.name)}</span>`).join("")+(records.length>9?'<span class="legend-item">…</span>':"");
    renderAnalysis(system.id,$("#singleAnalysisContent"),[system],false);
  }

  function setResultPanel(panel) {
    state.results.panel=panel;
    $$("[data-result-panel]").forEach(button=>{const active=button.dataset.resultPanel===panel;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});
    $$("[data-result-section]").forEach(section=>section.classList.toggle("active",section.dataset.resultSection===panel));
  }

  function comparisonIdentity(label,origin) {
    const id=`compare-${state.compare.nextId++}`;
    return {id,name:label||`System ${state.compare.nextId-1}`,source:"comparison",metadata:{origin}};
  }

  function addComparisonEntry(evaluation,model,origin,label) {
    const identity=comparisonIdentity(label||evaluation.name,origin),copy=clone(evaluation);copy.id=identity.id;copy.name=identity.name;copy.source="comparison";copy.metadata={...(copy.metadata||{}),comparisonOrigin:origin};
    state.compare.systems.push({id:identity.id,name:identity.name,origin,evaluation:copy,model:model?clone(model):null,previewModel:null,sourceId:evaluation.id});
    if(!state.compare.referenceId)state.compare.referenceId=identity.id;
    renderComparison();return identity.id;
  }

  function addCurrentToComparison() {
    const validation=validateModel();if(!validation.valid){toast("Resolve the canvas checks before adding this system.","error");setActiveView("workspace");return;}
    if(!state.currentEvaluation)state.currentEvaluation=evaluateGraphModel(state.graph,state.subjects,{},state.anchors);
    const number=state.compare.systems.filter(item=>item.origin==="canvas").length+1;
    addComparisonEntry(state.currentEvaluation,{graph:state.graph,anchors:state.anchors,subjects:state.subjects},"canvas",`Canvas snapshot ${number}`);toast("Canvas snapshot added to comparison.");
  }

  async function handleComparisonUploads(files) {
    let added=0;const failures=[];
    for(const file of Array.from(files||[])){
      try{const parsed=parseTopologyFile(file.name,await file.text());if(!parsed.subjects)throw new Error("a comparison snapshot must include a subjects array");const graphErrors=validateImportedGraph(parsed.graph);if(graphErrors.length)throw new Error(graphErrors.join(" "));const normalized=normalizeModelAnchors(parsed.graph,parsed.subjects,parsed.anchors||null);parsed.subjects=normalized.subjects;parsed.anchors=normalized.anchors;const modelValidation=validateModel(parsed.graph,parsed.subjects,parsed.anchors);if(!modelValidation.valid)throw new Error(modelValidation.errors.join(" "));const label=file.name.replace(/\.json$/i,"")||`Uploaded system ${added+1}`;const evaluation=evaluateGraphModel(parsed.graph,parsed.subjects,{id:"uploaded",name:label,source:"comparison",metadata:{origin:"upload"}},parsed.anchors);addComparisonEntry(evaluation,parsed,"upload",label);added++;}catch(error){failures.push(`${file.name}: ${error.message}`);}
    }
    $("#compareUploadInput").value="";renderComparison();if(added)toast(`Added ${added.toLocaleString()} uploaded system${added===1?"":"s"} to comparison.`);if(failures.length)toast(`Skipped ${failures.length} file${failures.length===1?"":"s"}: ${failures.slice(0,2).join("; ")}`,"warning",8000);
  }

  function addBatchToComparison() {
    const sourceId=$("#compareBatchSelect")?.value,system=batchEvaluations().find(item=>item.id===sourceId);if(!system){toast("Generate a batch or select a batch system first.","warning");return;}
    let model=null;
    if(state.simulation.lastConfig&&system.n<=EXACT_PREVIEW_LIMIT&&system.m<=EXACT_PREVIEW_EDGE_LIMIT){const full=createSimulationSystem(state.simulation.lastConfig,system.metadata.index,true);model=full.model;}
    addComparisonEntry(system,model,"simulation",system.name);toast("Simulation model added to comparison.");
  }

  function comparisonPreviewModel(entry) {
    if(entry.previewModel)return entry.previewModel;
    if(entry.model){const simplified=simplifyExistingModel(entry.model,180);entry.previewModel=simplified.model;return entry.previewModel;}
    if(entry.origin==="simulation"&&state.simulation.lastConfig){entry.previewModel=buildSimplifiedSimulationPreview(entry.evaluation).model;return entry.previewModel;}
    return null;
  }

  function drawComparisonThumbnail(canvas,model,evaluation) {
    const size=Math.max(130,canvas.getBoundingClientRect().width||180),dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*dpr);const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#fbfcfc";ctx.fillRect(0,0,size,size);ctx.strokeStyle="#edf0f2";ctx.lineWidth=1;for(let i=1;i<5;i++){const p=i*size/5;ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,size);ctx.stroke();ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(size,p);ctx.stroke();}
    if(!model){ctx.fillStyle="#6c7780";ctx.font="11px Inter, sans-serif";ctx.textAlign="center";ctx.fillText("Preview unavailable",size/2,size/2);return;}
    const nodes=model.graph.nodes,edges=model.graph.edges,positions=normalizedPreviewPositions(nodes,size,15),byId=new Map(nodes.map((node,index)=>[node.id,positions[index]])),edgeStep=Math.max(1,Math.ceil(edges.length/2500));ctx.strokeStyle="rgba(72,87,97,.28)";ctx.lineWidth=.7;ctx.beginPath();for(let i=0;i<edges.length;i+=edgeStep){const edge=edges[i],a=byId.get(edge.a),b=byId.get(edge.b);if(a&&b){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}}ctx.stroke();const r=nodes.length>140?1.3:nodes.length>60?2:3.3;ctx.fillStyle="#37c0fb";for(const point of positions){ctx.beginPath();ctx.arc(point.x,point.y,r,0,Math.PI*2);ctx.fill();}canvas.setAttribute("aria-label",`Square topology preview of ${evaluation.name}`);
  }

  function comparisonValue(entry) {
    const system=entry.evaluation;
    if(state.compare.mode==="subject"){
      const item=system.subjects.find(subjectItem=>subjectItem.name===state.compare.subject);
      if(!item)return null;
      return {kind:"subject",name:item.name,systemName:entry.name,tl:item.tl,il:item.il,length:item.length,color:item.color,classification:item.classification,distribution:item.distribution};
    }
    return {kind:"aggregate",name:"Aggregate A(Eₛ)",systemName:entry.name,tl:system.aggregate.tl,il:system.aggregate.il,length:system.aggregate.length,color:"#282a35",classification:system.systemClass,distribution:system.systemDistribution};
  }

  function comparisonSubjectSetKey(system) {
    return JSON.stringify(system.subjects.map(item=>item.name).sort((a,b)=>a.localeCompare(b)));
  }

  function comparisonSubjectSetLabel(system) {
    const names=system.subjects.map(item=>item.name).sort((a,b)=>a.localeCompare(b));
    return names.length<=3?names.join(" · "):`${names.slice(0,3).join(" · ")} +${names.length-3}`;
  }

  function drawComparisonChart(entries) {
    const title=state.compare.mode==="subject"?`${state.compare.subject} comparison`:"Aggregate-vector comparison";
    const records=entries.map((entry,index)=>{const value=comparisonValue(entry);return value?{...value,color:SUBJECT_COLORS[index%SUBJECT_COLORS.length],entryId:entry.id}:null;}).filter(Boolean);
    drawCompactVectorPlane($("#comparisonVectorChart"),records,state.compare.chartPoints,title);
  }

  function renderComparison() {
    const systems=state.compare.systems,empty=$("#compareEmpty"),content=$("#compareContent"),batchSelect=$("#compareBatchSelect");if(!empty||!content)return;
    const batch=batchEvaluations(),visibleBatch=limitedSystemOptions(batch,batchSelect?.value);batchSelect.innerHTML=visibleBatch.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("");$("#compareAddBatchBtn").disabled=!batch.length;
    empty.classList.toggle("hidden",systems.length>0);content.classList.toggle("hidden",!systems.length);
    const subjectNames=[...new Set(systems.flatMap(entry=>entry.evaluation.subjects.map(item=>item.name)))].sort((a,b)=>a.localeCompare(b));
    if(!subjectNames.includes(state.compare.subject))state.compare.subject=subjectNames[0]||null;
    const subjectSelect=$("#compareSubjectSelect");subjectSelect.innerHTML=subjectNames.map(name=>`<option value="${esc(name)}" ${name===state.compare.subject?"selected":""}>${esc(name)}</option>`).join("");
    const setGroups=new Map();for(const entry of systems){const key=comparisonSubjectSetKey(entry.evaluation);if(!setGroups.has(key))setGroups.set(key,{key,label:comparisonSubjectSetLabel(entry.evaluation),entries:[]});setGroups.get(key).entries.push(entry);}
    const groups=[...setGroups.values()].sort((a,b)=>a.label.localeCompare(b.label));
    if(!setGroups.has(state.compare.subjectSet)){const referenceEntry=systems.find(item=>item.id===state.compare.referenceId);state.compare.subjectSet=referenceEntry?comparisonSubjectSetKey(referenceEntry.evaluation):groups[0]?.key||null;}
    const setSelect=$("#compareSetSelect");setSelect.innerHTML=groups.map(group=>`<option value="${esc(group.key)}" ${group.key===state.compare.subjectSet?"selected":""}>${esc(group.label)} (${group.entries.length})</option>`).join("");
    const aggregateSetMode=state.compare.mode==="aggregate"&&state.compare.scope==="matched";
    $("#compareScope").value=state.compare.scope;$("#compareMode").value=state.compare.mode;$("#compareSubjectField").classList.toggle("hidden",state.compare.mode!=="subject");$("#compareSetField").classList.toggle("hidden",!aggregateSetMode);
    if(!systems.length){$("#compareCount").textContent="0 systems";return;}
    const candidates=state.compare.mode==="subject"?systems.filter(entry=>comparisonValue(entry)):aggregateSetMode?systems.filter(entry=>comparisonSubjectSetKey(entry.evaluation)===state.compare.subjectSet):systems.slice();
    if(!candidates.some(item=>item.id===state.compare.referenceId))state.compare.referenceId=candidates[0]?.id||null;
    const reference=candidates.find(item=>item.id===state.compare.referenceId)||candidates[0]||null,referenceSelect=$("#compareReferenceSelect");
    referenceSelect.innerHTML=candidates.map(item=>`<option value="${esc(item.id)}" ${item.id===reference?.id?"selected":""}>${esc(item.name)}</option>`).join("");referenceSelect.disabled=!reference;
    const visible=reference&&state.compare.scope==="matched"&&state.compare.mode==="subject"?candidates.filter(item=>sameSubjectProfile(item.evaluation,reference.evaluation)):candidates;
    $("#compareCount").textContent=visible.length===systems.length?`${systems.length.toLocaleString()} system${systems.length===1?"":"s"}`:`${systems.length.toLocaleString()} total · ${visible.length.toLocaleString()} shown`;
    const subjectMode=state.compare.mode==="subject",selectedSetGroup=setGroups.get(state.compare.subjectSet),chartTitle=subjectMode?`Subject-vector comparison · ${state.compare.subject}`:aggregateSetMode?`Aggregate comparison · ${selectedSetGroup?.label||"selected set"}`:"Aggregate-vector comparison";
    $("#comparisonChartTitle").textContent=chartTitle;$("#comparisonVectorChart").setAttribute("aria-label",`${chartTitle} plane`);
    $("#compareVectorHeading").textContent=subjectMode?"d⃗":"A(Eₛ)";$("#compareLengthHeading").textContent=subjectMode?"|d⃗|":"|A(Eₛ)|";$("#compareDeltaHeading").textContent=subjectMode?"Δ length":"Δ|A(Eₛ)|";
    $("#compareTableNote").textContent=subjectMode?`Length difference for ${state.compare.subject} relative to the reference.`:aggregateSetMode?"Only systems declaring the selected subject–anchor profile are shown.":"Aggregate length differences require the same declared subject–anchor profile.";
    drawComparisonChart(visible);
    const previewLimit=60,previewed=visible.slice(0,previewLimit);$("#compareTopologyStrip").innerHTML=previewed.map(entry=>`<article class="compare-thumb"><canvas data-compare-canvas="${esc(entry.id)}" width="180" height="180" aria-label="Topology preview"></canvas><div><strong>${esc(entry.name)}</strong><span>|V|=${entry.evaluation.n.toLocaleString()} · |E|=${entry.evaluation.m.toLocaleString()}</span></div></article>`).join("")+(visible.length>previewLimit?`<p class="compare-preview-limit">Showing ${previewLimit} of ${visible.length.toLocaleString()} matching previews; every shown system remains in the table and vector plane.</p>`:"");
    previewed.forEach(entry=>drawComparisonThumbnail($(`[data-compare-canvas="${entry.id}"]`),comparisonPreviewModel(entry),entry.evaluation));
    $("#compareTableBody").innerHTML=visible.map(entry=>{const system=entry.evaluation,value=comparisonValue(entry),sameSet=reference?sameSubjectProfile(system,reference.evaluation):false,comparable=subjectMode||sameSet,referenceValue=reference?comparisonValue(reference):null,delta=comparable&&referenceValue?value.length-referenceValue.length:null,profile=sameSet?"Same set":"Different set",canLoad=entry.model&&system.n<=EXACT_PREVIEW_LIMIT&&system.m<=EXACT_PREVIEW_EDGE_LIMIT;return `<tr><td>${esc(entry.name)}</td><td>${esc(entry.origin)}</td><td>${system.n.toLocaleString()} / ${system.m.toLocaleString()}</td><td class="vector-cell">[${fmt(value.tl)}, ${fmt(value.il)}]</td><td>${fmt(value.length)}</td><td>${esc(value.classification)}</td><td>${esc(value.distribution)}</td><td><span class="row-badge ${sameSet?"decentral":"aggregate"}">${profile}</span></td><td>${entry.id===reference?.id?"Reference":comparable?`${delta>=0?"+":""}${fmt(delta)}`:"—"}</td><td><button class="mini-btn" data-compare-load="${esc(entry.id)}" type="button" ${canLoad?"":"disabled"}>Load</button> <button class="mini-btn" data-compare-remove="${esc(entry.id)}" type="button">Remove</button></td></tr>`;}).join("");
  }

  function removeComparisonSystem(id) {
    state.compare.systems=state.compare.systems.filter(item=>item.id!==id);if(state.compare.referenceId===id)state.compare.referenceId=state.compare.systems[0]?.id||null;renderComparison();
  }

  function clearComparison() {
    state.compare.systems=[];state.compare.referenceId=null;state.compare.subject=null;state.compare.subjectSet=null;renderComparison();toast("Comparison set cleared.");
  }

  function loadComparisonToCanvas(id) {
    const entry=state.compare.systems.find(item=>item.id===id);if(!entry?.model)return;pushHistory();state.graph=clone(entry.model.graph);const normalized=normalizeModelAnchors(state.graph,clone(entry.model.subjects),clone(entry.model.anchors||null));state.subjects=normalized.subjects;state.anchors=normalized.anchors;state.activeAnchorId=state.anchors[0]?.id||null;state.currentEvaluation=evaluateGraphModel(state.graph,state.subjects,{id:"current",name:`Canvas · ${entry.name}`,source:"current"},state.anchors);state.selected=null;state.assignCenter=null;state.viewBox={x:0,y:0,w:PLANE_SIZE,h:PLANE_SIZE};syncSimulationTemplates(false);refreshWorkspace();fitGraph();setActiveView("workspace");toast("Comparison system and its anchor families loaded onto the editable canvas.");
  }

  function handleCompactChartPointer(event,points,tooltip) {
    const canvas=event.currentTarget,rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;let best=null,distance=Infinity;for(const point of points){const next=Math.hypot(point.x-x,point.y-y);if(next<point.r+5&&next<distance){best=point;distance=next;}}
    if(!best){tooltip.classList.add("hidden");return;}const record=best.record;tooltip.classList.remove("hidden");tooltip.style.left=`${clamp(best.x+12,8,rect.width-235)}px`;tooltip.style.top=`${clamp(best.y-20,8,rect.height-92)}px`;tooltip.innerHTML=`<strong>${esc(record.systemName||record.name)}</strong><br>${record.systemName&&record.name!==record.systemName?`${esc(record.name)}<br>`:""}d⃗=[${fmt(record.tl)}, ${fmt(record.il)}] · |d⃗|=${fmt(record.length)}<br>${esc(record.classification)} · ${esc(record.distribution)}`;
  }

  function renderResults() {
    const evaluations=batchEvaluations();
    const empty=$("#emptyResults"),content=$("#resultsContent");
    empty.classList.toggle("hidden",evaluations.length>0);content.classList.toggle("hidden",!evaluations.length);
    if(!evaluations.length)return;
    if(!evaluations.some(item=>item.id===state.results.selectedSystem))state.results.selectedSystem=evaluations[0].id;
    ensureResultSubjectFilters();
    renderSummaryCards();
    const records=resultRecords();
    state.results.visibleRecords=records;
    renderChart(records);
    renderResultsTable(records);
    renderSharedValueAnalysis(records);
    renderSystemPreviewSelector();
    renderSystemPreview(state.results.previewSystem);
    renderAnalysisSelector();
    renderAnalysis(state.results.selectedSystem);
    setResultPanel(state.results.panel);
  }

  function renderSummaryCards() {
    const systems=evaluationsForResultScope(),selected=getSelectedEvaluation();
    const meanTl=systems.length?systems.reduce((sum,item)=>sum+item.aggregate.tl,0)/systems.length:NaN;
    const meanIl=systems.length?systems.reduce((sum,item)=>sum+item.aggregate.il,0)/systems.length:NaN;
    const full=systems.filter(item=>item.systemClass==="Fully decentralized").length;
    $("#summaryCards").innerHTML=`
      <article class="summary-card" style="--accent:#37c0fb"><small>Batch scope</small><strong>${systems.length.toLocaleString()} systems</strong><span>${full.toLocaleString()} fully decentralized</span></article>
      <article class="summary-card" style="--accent:#2878b5"><small>Mean aggregate</small><strong>[${fmt(meanTl)}, ${fmt(meanIl)}]</strong><span>Equal mean across systems in scope</span></article>
      <article class="summary-card" style="--accent:#d98200"><small>Selected system</small><strong>${esc(selected?.systemClass||"—")}</strong><span>dim=${selected?.dimensionality??"—"}/${selected?.subjectCount??"—"} · |A(Eₛ)|=${fmt(selected?.aggregate.length)}</span></article>`;
  }

  function groupSharedValues(records,metric,precision,minSize) {
    const buckets=new Map();
    for(const record of records){
      if(record.kind!=="subject"||!Number.isFinite(record[metric]))continue;
      const key=Number(record[metric]).toFixed(precision);
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(record);
    }
    return [...buckets.entries()].filter(([,items])=>items.length>=minSize).map(([key,items])=>({key,value:Number(key),records:items,count:items.length,systemCount:new Set(items.map(item=>item.systemId)).size})).sort((a,b)=>b.count-a.count||a.value-b.value);
  }

  function sharedDriverSignature(record,metric) {
    const epsilon=Number(record.epsilon).toPrecision(12);
    return metric==="tl"?`${record.mu}|${record.n}|${record.rv}|${record.gs}|${epsilon}`:`${record.mu}|${record.n}|${record.lambda}|${record.re}|${epsilon}`;
  }

  function explainSharedValueGroup(group,metric,precision) {
    const records=group.records,total=records.length,value=group.value,signatures=new Map();
    for(const record of records){const signature=sharedDriverSignature(record,metric);signatures.set(signature,(signatures.get(signature)||0)+1);}
    const largestSignature=Math.max(0,...signatures.values());
    let cause;
    if(metric==="tl"){
      const centralized=records.filter(record=>record.mu===1).length;
      const upper=records.filter(record=>record.mu>1&&record.rv===0).length;
      const general=total-centralized-upper;
      if(value===0)cause=`Proposition 1: ${centralized}/${total} use µ=1; the rest round to 0.`;
      else if(value===1)cause=`Proposition 1: ${upper}/${total} use rᵥ=0; ${general} general-case value${general===1?"":"s"} round to 1.`;
      else cause=`Proposition 1: equal after rounding from |Gₜ|, rᵥ, |Gₛ|, and ε.`;
    }else{
      const centralized=records.filter(record=>record.mu===1).length;
      const edgeless=records.filter(record=>record.mu>1&&record.m===0).length;
      const isolated=records.filter(record=>record.mu>1&&record.m>0&&record.re<=0).length;
      const upper=records.filter(record=>record.mu>1&&record.re===record.n-1&&record.lambda>1).length;
      const general=total-centralized-edgeless-isolated-upper;
      if(value===0)cause=`Proposition 2: ${centralized} use µ=1, ${edgeless} use |E|=0, ${isolated} use rₑ=0, and ${general} round to 0.`;
      else if(value===1)cause=`Proposition 2: ${upper}/${total} satisfy rₑ=|Gₜ|−1 and λ>1; ${general} general-case value${general===1?"":"s"} round to 1.`;
      else cause=`Proposition 2: equal after rounding from |Gₜ|, λ, rₑ, and ε.`;
    }
    const tuple=signatures.size===1?"One driver tuple.":`${signatures.size} driver tuples; largest group ${largestSignature}/${total} at ${precision} decimals.`;
    return `${cause} ${tuple} Ontology follows anchor-relative µ.`;
  }

  function drawSharedValueChart(groups,metric) {
    const canvas=$("#sharedValueChart");if(!canvas)return;
    const rect=canvas.getBoundingClientRect(),w=Math.max(560,rect.width||1000),h=260,dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);
    state.results.sharedPoints=[];
    const label=metric==="tl"?"Void Tolerance":"Imperviousness",visible=groups.slice(0,40);
    canvas.setAttribute("aria-label",`${label} repeated-value frequency plot with ${groups.length} qualifying groups`);
    ctx.fillStyle="#344049";ctx.font="700 12px Inter, sans-serif";ctx.textAlign="left";ctx.fillText(`${label}: repeated-value frequency`,52,22);
    if(!visible.length){ctx.fillStyle="#6b7780";ctx.font="12px Inter, sans-serif";ctx.textAlign="center";ctx.fillText("No value occurs often enough under the current scope and precision.",w/2,h/2);return;}
    const margin={left:52,right:30,top:45,bottom:48},pw=w-margin.left-margin.right,ph=h-margin.top-margin.bottom,peak=Math.max(...visible.map(group=>group.count));
    ctx.strokeStyle="#e1e5e8";ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=margin.top+ph*i/4;ctx.beginPath();ctx.moveTo(margin.left,y);ctx.lineTo(w-margin.right,y);ctx.stroke();}
    ctx.strokeStyle="#59666f";ctx.beginPath();ctx.moveTo(margin.left,margin.top);ctx.lineTo(margin.left,margin.top+ph);ctx.lineTo(w-margin.right,margin.top+ph);ctx.stroke();
    for(const value of [0,.5,1]){const x=margin.left+pw*value;ctx.fillStyle="#65727b";ctx.font="10px Inter, sans-serif";ctx.textAlign="center";ctx.fillText(fmt(value,1),x,h-24);}
    ctx.fillStyle="#65727b";ctx.font="10px Inter, sans-serif";ctx.textAlign="left";ctx.fillText("records per group",margin.left,margin.top-12);
    for(const group of visible){
      const x=margin.left+clamp(group.value,0,1)*pw,y=margin.top+ph-(group.count/peak)*ph,r=4+9*Math.sqrt(group.count/peak);
      ctx.strokeStyle="rgba(22,152,207,.46)";ctx.beginPath();ctx.moveTo(x,margin.top+ph);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle="rgba(55,192,251,.72)";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#1279a5";ctx.stroke();
      state.results.sharedPoints.push({x,y,r:r+4,group,label});
    }
  }

  function renderSharedValueAnalysis(records) {
    const metric=$("#sharedMetric")?.value||"tl",precision=clamp(Number($("#sharedPrecision")?.value||4),0,8),minSize=clamp(Math.round(Number($("#sharedMinSize")?.value||2)),2,MAX_BATCH_SYSTEMS);
    if($("#sharedMinSize"))$("#sharedMinSize").value=String(minSize);
    const groups=groupSharedValues(records,metric,precision,minSize);state.results.sharedGroups=groups;drawSharedValueChart(groups,metric);
    const host=$("#sharedValueExplanations");if(!host)return;
    if(!groups.length){host.innerHTML='<div class="shared-value-empty">No repeated profile-entry value meets the current minimum. Broaden the result scope, lower the minimum, or reduce equality precision.</div>';return;}
    const label=metric==="tl"?"Tₗ":"Iₗ";
    host.innerHTML=groups.slice(0,12).map(group=>{const examples=group.records.slice(0,3).map(record=>`${record.systemName} / ${record.name}`).join("; ");return `<article class="shared-value-group"><strong>${label}=${esc(group.key)} · ${group.count.toLocaleString()} records in ${group.systemCount.toLocaleString()} systems</strong><p>${esc(explainSharedValueGroup(group,metric,precision))}</p><small>Examples: ${esc(examples)}${group.count>3?"; …":""}</small></article>`;}).join("");
  }

  function simplifyExistingModel(model,limit=SIMPLIFIED_PREVIEW_NODES) {
    const nodes=model.graph.nodes,edges=model.graph.edges;
    if(nodes.length<=limit)return {model,sampled:false};
    const index=new Map(nodes.map((node,i)=>[node.id,i])),adj=Array.from({length:nodes.length},()=>[]),degree=new Int32Array(nodes.length);
    for(const edge of edges){const a=index.get(edge.a),b=index.get(edge.b);if(a==null||b==null)continue;adj[a].push(b);adj[b].push(a);degree[a]++;degree[b]++;}
    let root=0;for(let i=1;i<degree.length;i++)if(degree[i]>degree[root])root=i;
    const selected=new Set(),queue=[];
    const seed=indexValue=>{if(indexValue!=null&&!selected.has(indexValue)&&selected.size<limit){selected.add(indexValue);queue.push(indexValue);}};
    seed(root);for(const item of model.subjects||[])for(const id of Object.keys(item.realizations||{})){seed(index.get(id));break;}
    for(let cursor=0;cursor<queue.length&&selected.size<limit;cursor++)for(const neighbour of adj[queue[cursor]])seed(neighbour);
    if(selected.size<limit)for(let i=0;i<nodes.length&&selected.size<limit;i++)seed(Math.floor(i*nodes.length/limit));
    const ids=new Set([...selected].map(i=>nodes[i].id)),sampleNodes=[...selected].map(i=>nodes[i]),sampleEdges=edges.filter(edge=>ids.has(edge.a)&&ids.has(edge.b));
    const sampleSubjects=(model.subjects||[]).map(item=>({...item,realizations:Object.fromEntries(Object.entries(item.realizations||{}).filter(([id])=>ids.has(id)))}));
    const sampleAnchors=(model.anchors||[]).map(anchor=>({...anchor,regions:(anchor.regions||[]).map(region=>({...region,vertices:(region.vertices||[]).filter(id=>ids.has(id))}))}));
    return {model:{graph:{nodes:sampleNodes,edges:sampleEdges},anchors:sampleAnchors,subjects:sampleSubjects},sampled:true};
  }

  function buildSimplifiedSimulationPreview(system) {
    const config=state.simulation.lastConfig,draw=simulationDrawForIndex(config,system.metadata.index),sampleN=Math.min(SIMPLIFIED_PREVIEW_NODES,draw.n),rng=mulberry32(hashSeed(`${draw.seed}:square-preview`));
    const topology=generateTopology(sampleN,draw.type,draw.systemConfig,rng),subjects=synthesizeSubjects(topology,config.templates,rng,config.anchorTemplates),positions=positionsForTopology(topology);
    return {model:{graph:{nodes:Array.from({length:sampleN},(_,i)=>({id:`v${i+1}`,label:`v${i+1}`,x:positions[i].x,y:positions[i].y})),edges:topology.edges.map(([a,b],i)=>({id:`pe${i+1}`,a:`v${a+1}`,b:`v${b+1}`}))},anchors:subjects.generatedAnchors.map(anchor=>({id:anchor.id,name:anchor.name,type:anchor.type,color:anchor.color,regions:anchor.regions.map(region=>({id:region.id,name:region.name,color:region.color,vertices:region.vertices.map(vertex=>`v${vertex+1}`)}))})),subjects:subjects.map(item=>({id:item.id,name:item.name,anchorId:item.anchorId,anchor:item.anchor,color:item.color,epsilon:item.epsilon,delta:item.delta,realizations:Object.fromEntries(item.supportIndices.map((v,i)=>[`v${v+1}`,item.counts[i]]))}))},fidelity:"schematic",sampleN,type:draw.type};
  }

  function previewDataForSystem(system,mode) {
    const feasible=system.n<=EXACT_PREVIEW_LIMIT&&system.m<=EXACT_PREVIEW_EDGE_LIMIT;
    if(system.source==="current"){
      const fullModel={graph:state.graph,anchors:state.anchors,subjects:state.subjects};
      if(mode==="simplified"||!feasible){const simplified=simplifyExistingModel(fullModel);return {model:simplified.model,fidelity:simplified.sampled?"schematic":"exact",type:null,note:simplified.sampled?`An induced ${simplified.model.graph.nodes.length}-vertex workspace schematic is shown because the exact canvas is too dense.`:"The complete workspace topology is shown."};}
      return {model:fullModel,fidelity:"exact",type:null,note:"The complete workspace topology is shown."};
    }
    if(mode!=="simplified"&&feasible&&state.simulation.lastConfig){
      const reconstructed=createSimulationSystem(state.simulation.lastConfig,system.metadata.index,true);
      return {model:reconstructed.model,fidelity:"exact",type:system.metadata.type,note:"The deterministic seed reconstructs the complete generated topology realization."};
    }
    const simplified=buildSimplifiedSimulationPreview(system);
    const reason=mode==="full"&&!feasible?`Exact preview is limited to ${EXACT_PREVIEW_LIMIT.toLocaleString()} vertices and ${EXACT_PREVIEW_EDGE_LIMIT.toLocaleString()} edges.`:"Simplified fidelity was selected.";
    return {...simplified,note:`${reason} This sample preserves the generator family and subject-template pattern, but it is not the evaluated Gₜ.`};
  }

  function normalizedPreviewPositions(nodes,size,pad) {
    const fallback=nodes.map((node,i)=>({x:size/2+Math.cos(-Math.PI/2+i/Math.max(1,nodes.length)*Math.PI*2)*(size/2-pad),y:size/2+Math.sin(-Math.PI/2+i/Math.max(1,nodes.length)*Math.PI*2)*(size/2-pad)}));
    if(!nodes.length||!nodes.every(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)))return fallback;
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const node of nodes){minX=Math.min(minX,node.x);maxX=Math.max(maxX,node.x);minY=Math.min(minY,node.y);maxY=Math.max(maxY,node.y);}
    const span=Math.max(1,maxX-minX,maxY-minY),scale=(size-pad*2)/span,cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    return nodes.map(node=>({x:size/2+(node.x-cx)*scale,y:size/2+(node.y-cy)*scale}));
  }

  function drawSystemPreview(data,system) {
    const canvas=$("#systemPreviewCanvas"),rect=canvas.getBoundingClientRect(),size=Math.max(360,Math.min(700,rect.width||700)),dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*dpr);
    const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);ctx.fillStyle="#fbfcfc";ctx.fillRect(0,0,size,size);ctx.strokeStyle="#edf0f2";ctx.lineWidth=1;for(let i=1;i<10;i++){const p=i*size/10;ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,size);ctx.stroke();ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(size,p);ctx.stroke();}
    const nodes=data.model.graph.nodes,edges=data.model.graph.edges,positions=normalizedPreviewPositions(nodes,size,32),pointById=new Map(nodes.map((node,i)=>[node.id,positions[i]])),edgeStep=Math.max(1,Math.ceil(edges.length/PREVIEW_EDGE_LIMIT));let drawnEdges=0;
    ctx.strokeStyle="rgba(72,87,97,.27)";ctx.lineWidth=nodes.length>800?.45:.8;ctx.beginPath();for(let i=0;i<edges.length;i+=edgeStep){const edge=edges[i],a=pointById.get(edge.a),b=pointById.get(edge.b);if(!a||!b)continue;ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);drawnEdges++;}ctx.stroke();
    const supportColors=new Map();for(const item of data.model.subjects||[])for(const id of Object.keys(item.realizations||{})){if(!supportColors.has(id))supportColors.set(id,[]);supportColors.get(id).push(item.color||"#37c0fb");}
    const radius=nodes.length>2500?1.1:nodes.length>900?1.6:nodes.length>220?2.3:nodes.length>80?3.1:5.2;
    nodes.forEach((node,i)=>{const point=positions[i],colors=supportColors.get(node.id)||[];ctx.fillStyle=colors[0]||"#68757e";ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);ctx.fill();if(colors.length>1&&radius>=2.3){ctx.strokeStyle=colors[1];ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(point.x,point.y,radius+1.7,0,Math.PI*2);ctx.stroke();}});
    if(nodes.length<=32){ctx.fillStyle="#344049";ctx.font="9px Inter, sans-serif";ctx.textAlign="center";nodes.forEach((node,i)=>ctx.fillText(node.label||node.id,positions[i].x,positions[i].y-radius-5));}
    canvas.setAttribute("aria-label",`${data.fidelity==="exact"?"Exact":"Simplified"} square-plane preview of ${system.name}, showing ${nodes.length} vertex marks and ${drawnEdges} edge marks`);
    return {drawnEdges,drawnNodes:nodes.length,totalModelEdges:edges.length};
  }

  function limitedSystemOptions(systems,selectedId) {
    const visible=systems.slice(0,SYSTEM_SELECTOR_LIMIT),selected=systems.find(item=>item.id===selectedId);if(selected&&!visible.includes(selected))visible.push(selected);return visible;
  }

  function renderSystemPreviewSelector() {
    const select=$("#previewSystemSelect"),systems=batchEvaluations();if(!select)return;
    if(!systems.length){select.innerHTML="";return;}
    if(!systems.some(item=>item.id===state.results.previewSystem))state.results.previewSystem=systems[0].id;
    const visible=limitedSystemOptions(systems,state.results.previewSystem),omitted=Math.max(0,systems.length-visible.length);
    select.innerHTML=visible.map(item=>`<option value="${esc(item.id)}" ${item.id===state.results.previewSystem?"selected":""}>${esc(item.name)}</option>`).join("")+(omitted?`<option disabled>… ${omitted.toLocaleString()} more — use table Preview</option>`:"");
  }

  function renderSystemPreview(systemId=state.results.previewSystem) {
    const systems=batchEvaluations(),system=systems.find(item=>item.id===systemId)||systems[0],canvas=$("#systemPreviewCanvas"),details=$("#systemPreviewDetails");if(!system||!canvas||!details)return;
    state.results.previewSystem=system.id;if($("#previewSystemSelect"))$("#previewSystemSelect").value=system.id;
    const mode=$("#previewMode")?.value||state.results.previewMode;state.results.previewMode=mode;
    const key=`${system.id}|${mode}|${system.evaluatedAt}|${state.simulation.batchId}`;let data=state.results.previewCache.key===key?state.results.previewCache.data:null;
    if(!data){data=previewDataForSystem(system,mode);state.results.previewCache={key,data};}
    const drawing=drawSystemPreview(data,system),type=data.type||system.metadata?.type,subjectChips=system.subjects.map(item=>`<span class="preview-subject-chip"><i style="background:${esc(item.color)}"></i>${esc(item.name)} · δ=${item.delta}, λ=${item.lambda}, µ=${item.mu}</span>`).join("");
    $("#systemPreviewBadge").textContent=data.fidelity==="exact"?"Exact topology realization":"Simplified generator schematic";
    const markNote=drawing.totalModelEdges>drawing.drawnEdges?` For legibility, ${drawing.drawnEdges.toLocaleString()} evenly sampled edge marks represent ${drawing.totalModelEdges.toLocaleString()} exact preview edges.`:"";
    details.innerHTML=`<div class="preview-summary"><h3>${esc(system.name)}</h3><p>${esc(system.systemClass)} · aggregate [${fmt(system.aggregate.tl)}, ${fmt(system.aggregate.il)}], |A(Eₛ)|=${fmt(system.aggregate.length)}</p></div><div class="preview-facts"><div class="preview-fact"><small>Topology family</small><strong>${esc(type?topologyName(type):"Edited / imported")}</strong></div><div class="preview-fact"><small>Exact Gₜ order / size</small><strong>|V|=${system.n.toLocaleString()} · |E|=${system.m.toLocaleString()}</strong></div><div class="preview-fact"><small>Connected components</small><strong>${system.componentCount.toLocaleString()}</strong></div><div class="preview-fact"><small>Preview marks</small><strong>${drawing.drawnNodes.toLocaleString()} vertices · ${drawing.drawnEdges.toLocaleString()} edges</strong></div></div><div class="preview-subjects">${subjectChips}</div><p class="preview-note">${esc(data.note+markNote)} The numerical evaluation, center multiplicity, and ontology classification always use the complete exact Gₜ; a schematic never substitutes for that model.</p>`;
  }

  function colorForRecord(record,index=0) {
    const mode=$("#colorBy")?.value||"subject";
    if(record.kind==="aggregate")return "#282a35";
    if(mode==="classification")return record.classification==="Decentralized"?"#37c0fb":"#c53737";
    if(mode==="system")return SUBJECT_COLORS[Math.abs(hashSeed(record.systemId))%SUBJECT_COLORS.length];
    return record.color||SUBJECT_COLORS[index%SUBJECT_COLORS.length];
  }

  function renderChart(records) {
    const canvas=$("#resultsChart"),type=$("#chartType").value;
    const rect=canvas.getBoundingClientRect(),cssW=Math.max(420,rect.width||900),cssH=Math.max(390,parseFloat(getComputedStyle(canvas).height)||520),dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
    const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);
    state.results.chartPoints=[];state.results.chartRecords=records;
    if(type==="vectors")drawVectorPlane(ctx,cssW,cssH,records);
    else if(type==="distribution")drawDistributionPlane(ctx,cssW,cssH,records);
    else if(type==="composition")drawRealizationComposition(ctx,cssW,cssH,records);
    else if(type==="bars")drawBars(ctx,cssW,cssH,records);
    else if(type==="heatmap")drawHeatmap(ctx,cssW,cssH,records);
    else drawHistogram(ctx,cssW,cssH,records);
  }

  function chartBase(ctx,w,h,title,subtitle) {
    $("#chartTitle").textContent=title;$("#chartSubtitle").textContent=subtitle;
    ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.font="12px Inter, sans-serif";ctx.textBaseline="middle";
  }

  function squarePlot(w,h,margin={left:54,right:16,top:16,bottom:48}) {
    const availableW=Math.max(1,w-margin.left-margin.right),availableH=Math.max(1,h-margin.top-margin.bottom),size=Math.min(availableW,availableH);
    return {left:margin.left+(availableW-size)/2,top:margin.top+(availableH-size)/2,size};
  }

  function drawVectorPlane(ctx,w,h,records) {
    chartBase(ctx,w,h,"Decentralization vector plane","Analytical coordinates in [0,1]² · hover for exact values");
    const plot=squarePlot(w,h),pw=plot.size,ph=plot.size,margin={left:plot.left,top:plot.top};
    ctx.strokeStyle="#e0e4e7";ctx.lineWidth=1;
    for(const value of [0,.5,1]){
      const x=margin.left+pw*value,y=margin.top+ph*(1-value);
      ctx.beginPath();ctx.moveTo(x,margin.top);ctx.lineTo(x,margin.top+ph);ctx.stroke();ctx.beginPath();ctx.moveTo(margin.left,y);ctx.lineTo(margin.left+pw,y);ctx.stroke();
      ctx.fillStyle="#69757e";ctx.textAlign="center";ctx.fillText(fmt(value,1),x,margin.top+ph+20);ctx.textAlign="right";ctx.fillText(fmt(value,1),margin.left-10,y);
    }
    ctx.strokeStyle="#303942";ctx.lineWidth=1.5;ctx.strokeRect(margin.left,margin.top,pw,ph);
    ctx.fillStyle="#344049";ctx.font="700 12px Inter, sans-serif";ctx.textAlign="center";ctx.fillText("Tₗ",margin.left+pw/2,margin.top+ph+43);ctx.fillText("Iₗ",margin.left-40,margin.top+ph/2);
    const origin={x:margin.left,y:margin.top+ph};
    const maxPoints=9000,sampled=records.length<=maxPoints?records:records.filter((_,i)=>i%Math.ceil(records.length/maxPoints)===0).slice(0,maxPoints);
    const showLines=$("#showVectorLines").checked,showLabels=$("#showLabels").checked&&sampled.length<=120;
    sampled.forEach((record,i)=>{
      const x=margin.left+record.tl*pw,y=margin.top+(1-record.il)*ph,color=colorForRecord(record,i);
      if(showLines){ctx.strokeStyle=hexAlpha(color,record.kind==="aggregate"?.38:.15);ctx.lineWidth=record.kind==="aggregate"?1.6:1;ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.lineTo(x,y);ctx.stroke();}
      ctx.fillStyle=hexAlpha(color,records.length>500?.38:.86);ctx.strokeStyle=record.kind==="aggregate"?"#fff":"rgba(255,255,255,.7)";ctx.lineWidth=record.kind==="aggregate"?2:1;
      ctx.beginPath();
      if(record.kind==="aggregate"){ctx.moveTo(x,y-7);ctx.lineTo(x+7,y);ctx.lineTo(x,y+7);ctx.lineTo(x-7,y);ctx.closePath();}
      else ctx.arc(x,y,records.length>1000?2.5:4.5,0,Math.PI*2);
      ctx.fill();ctx.stroke();
      if(showLabels){ctx.fillStyle="#303942";ctx.font="10px Inter, sans-serif";ctx.textAlign="left";ctx.fillText(record.kind==="aggregate"?record.systemName:record.name,x+7,y-7);}
      state.results.chartPoints.push({x,y,r:record.kind==="aggregate"?9:7,record});
    });
    renderChartLegend(sampled);
  }

  function drawDistributionPlane(ctx,w,h,records) {
    chartBase(ctx,w,h,"Distribution plane","Support coverage λ/|G| × dispersion efficiency λ/δ (descriptive; ontology remains λ > 1)");
    const plot=squarePlot(w,h,{left:54,right:16,top:40,bottom:48}),margin={left:plot.left,top:plot.top},size=plot.size;
    ctx.fillStyle="#f5faff";ctx.fillRect(margin.left,margin.top,size,size);
    ctx.strokeStyle="#e0e4e7";ctx.lineWidth=1;
    for(const value of [0,.5,1]){
      const x=margin.left+size*value,y=margin.top+size*(1-value);
      ctx.beginPath();ctx.moveTo(x,margin.top);ctx.lineTo(x,margin.top+size);ctx.stroke();ctx.beginPath();ctx.moveTo(margin.left,y);ctx.lineTo(margin.left+size,y);ctx.stroke();
      ctx.fillStyle="#69757e";ctx.textAlign="center";ctx.fillText(fmt(value,1),x,margin.top+size+20);ctx.textAlign="right";ctx.fillText(fmt(value,1),margin.left-10,y);
    }
    ctx.strokeStyle="#303942";ctx.lineWidth=1.5;ctx.strokeRect(margin.left,margin.top,size,size);
    ctx.fillStyle="#344049";ctx.font="700 12px Inter, sans-serif";ctx.textAlign="center";ctx.fillText("Support coverage  λ / |G|",margin.left+size/2,margin.top+size+43);ctx.textAlign="left";ctx.fillText("Dispersion efficiency  λ / δ",margin.left,margin.top-19);
    ctx.font="10px Inter, sans-serif";ctx.fillStyle="#607686";ctx.textAlign="left";ctx.fillText("broader vertex support →",margin.left+10,margin.top+14);ctx.textAlign="right";ctx.fillText("higher dispersion",margin.left+size-10,margin.top+size-12);
    const maxPoints=9000,sampled=records.length<=maxPoints?records:records.filter((_,i)=>i%Math.ceil(records.length/maxPoints)===0).slice(0,maxPoints),showLabels=$("#showLabels").checked&&sampled.length<=120;
    sampled.forEach((record,i)=>{
      const coverage=clamp(Number(record.coverage)||0,0,1),dispersion=clamp(Number(record.dispersion)||0,0,1),x=margin.left+coverage*size,y=margin.top+(1-dispersion)*size,color=colorForRecord(record,i);
      ctx.fillStyle=hexAlpha(color,records.length>500?.4:.88);ctx.strokeStyle=record.kind==="aggregate"?"#fff":"rgba(255,255,255,.75)";ctx.lineWidth=record.kind==="aggregate"?2:1;ctx.beginPath();
      if(record.kind==="aggregate"){ctx.moveTo(x,y-7);ctx.lineTo(x+7,y);ctx.lineTo(x,y+7);ctx.lineTo(x-7,y);ctx.closePath();}else ctx.arc(x,y,records.length>1000?2.5:4.5,0,Math.PI*2);
      ctx.fill();ctx.stroke();if(showLabels){ctx.fillStyle="#303942";ctx.font="10px Inter, sans-serif";ctx.textAlign="left";ctx.fillText(record.kind==="aggregate"?record.systemName:record.name,x+7,y-7);}
      state.results.chartPoints.push({x,y,r:record.kind==="aggregate"?9:7,record});
    });
    renderChartLegend(sampled);
  }

  function drawRealizationComposition(ctx,w,h,records) {
    const selected=getSelectedEvaluation();let rows=records.filter(record=>record.kind==="subject"&&(!selected||record.systemId===selected.id));
    if(!rows.length)rows=records.filter(record=>record.kind==="subject");rows=rows.slice(0,28);
    chartBase(ctx,w,h,"Realization composition",selected?`Selected: ${selected.name} · unique support λ versus co-located excess δ−λ`:"Unique support λ versus co-located excess δ−λ");
    const margin={left:Math.min(225,w*.3),right:50,top:30,bottom:50},rowH=(h-margin.top-margin.bottom)/Math.max(1,rows.length),barW=w-margin.left-margin.right;
    ctx.strokeStyle="#e2e6e8";for(const value of [0,.5,1]){const x=margin.left+barW*value;ctx.beginPath();ctx.moveTo(x,margin.top);ctx.lineTo(x,h-margin.bottom);ctx.stroke();ctx.fillStyle="#69757e";ctx.textAlign="center";ctx.fillText(`${fmt(value*100,0)}%`,x,h-23);}
    rows.forEach((record,i)=>{const y=margin.top+i*rowH,ratio=clamp(Number(record.dispersion)||0,0,1),color=colorForRecord(record,i),bh=Math.max(7,Math.min(22,rowH*.55));ctx.fillStyle="#39444c";ctx.textAlign="right";ctx.font="11px Inter, sans-serif";ctx.fillText(record.name,margin.left-10,y+rowH/2);ctx.fillStyle=color;ctx.fillRect(margin.left,y+(rowH-bh)/2,barW*ratio,bh);ctx.fillStyle="#e8a23a";ctx.fillRect(margin.left+barW*ratio,y+(rowH-bh)/2,barW*(1-ratio),bh);ctx.fillStyle="#344049";ctx.textAlign="left";ctx.font="10px Inter, sans-serif";ctx.fillText(`λ=${record.lambda} of δ=${record.delta}`,margin.left+barW+7,y+rowH/2);state.results.chartPoints.push({x:margin.left+barW*ratio,y:y+rowH/2,r:Math.max(8,rowH/2),record});});
    $("#chartLegend").innerHTML='<span class="legend-item"><i class="legend-swatch" style="background:#37c0fb"></i>Distinct supporting vertices (λ)</span><span class="legend-item"><i class="legend-swatch" style="background:#e8a23a"></i>Co-located excess (δ−λ)</span>';
  }

  function drawBars(ctx,w,h,records) {
    const selected=getSelectedEvaluation();
    let rows=records;
    if(selected)rows=records.filter(record=>record.systemId===selected.id);
    if(!rows.length)rows=records;
    rows=rows.slice(0,28);
    chartBase(ctx,w,h,"Metric component bars",selected?`Selected: ${selected.name}`:"Selected result scope");
    const margin={left:Math.min(210,w*.28),right:35,top:25,bottom:45},rowH=(h-margin.top-margin.bottom)/Math.max(1,rows.length),barW=w-margin.left-margin.right;
    ctx.strokeStyle="#e3e6e8";for(const value of [0,.5,1]){const x=margin.left+barW*value;ctx.beginPath();ctx.moveTo(x,margin.top);ctx.lineTo(x,h-margin.bottom);ctx.stroke();ctx.fillStyle="#6b7680";ctx.textAlign="center";ctx.fillText(fmt(value,1),x,h-22);}
    rows.forEach((record,i)=>{
      const y=margin.top+i*rowH,color=colorForRecord(record,i),barHeight=Math.max(3,rowH*.26);
      ctx.fillStyle="#39444c";ctx.textAlign="right";ctx.font="11px Inter, sans-serif";ctx.fillText(record.kind==="aggregate"?"A(Eₛ)":record.name,margin.left-10,y+rowH/2);
      ctx.fillStyle=hexAlpha(color,.9);ctx.fillRect(margin.left,y+rowH*.18,barW*record.tl,barHeight);
      ctx.fillStyle=hexAlpha(color,.45);ctx.fillRect(margin.left,y+rowH*.56,barW*record.il,barHeight);
      state.results.chartPoints.push({x:margin.left+barW*Math.max(record.tl,record.il),y:y+rowH/2,r:Math.max(8,rowH/2),record});
    });
    $("#chartLegend").innerHTML='<span class="legend-item"><i class="legend-swatch" style="background:#37c0fb"></i>Void Tolerance (solid)</span><span class="legend-item"><i class="legend-swatch" style="background:#a9e2fa"></i>Imperviousness (light)</span>';
  }

  function drawHeatmap(ctx,w,h,records) {
    const focus=$("#metricFocus").value,metric=["tl","il","coverage","dispersion"].includes(focus)?focus:"length",metricLabel=focus==="tl"?"Void Tolerance":focus==="il"?"Imperviousness":focus==="coverage"?"Support coverage":focus==="dispersion"?"Dispersion efficiency":"Vector length";
    const systemMap=new Map(),columnSet=new Set();for(const record of records){if(systemMap.size<80&&!systemMap.has(record.systemId))systemMap.set(record.systemId,record.systemName);if(columnSet.size<24)columnSet.add(record.kind==="aggregate"?"A(Eₛ)":record.name);if(systemMap.size>=80&&columnSet.size>=24)break;}
    const systems=[...systemMap.entries()],columns=[...columnSet];
    chartBase(ctx,w,h,"System heatmap",`${metricLabel}; up to 80 systems × 24 dimensions`);
    const margin={left:Math.min(190,w*.25),right:20,top:54,bottom:25},cw=(w-margin.left-margin.right)/Math.max(1,columns.length),ch=(h-margin.top-margin.bottom)/Math.max(1,systems.length);
    ctx.font="9px Inter, sans-serif";ctx.textAlign="center";ctx.fillStyle="#4d5962";columns.forEach((name,i)=>{const limit=Math.max(2,Math.floor(cw/5.5)),label=name.length>limit?`${name.slice(0,Math.max(1,limit-1))}…`:name;ctx.fillText(label,margin.left+i*cw+cw/2,margin.top-13);});
    const allowedSystems=new Set(systemMap.keys()),map=new Map();for(const record of records){if(!allowedSystems.has(record.systemId))continue;const column=record.kind==="aggregate"?"A(Eₛ)":record.name;if(columnSet.has(column))map.set(`${record.systemId}\u0000${column}`,record);}
    systems.forEach(([id,name],r)=>{
      ctx.fillStyle="#4b5760";ctx.textAlign="right";ctx.font="10px Inter, sans-serif";ctx.fillText(name.length>25?`${name.slice(0,23)}…`:name,margin.left-7,margin.top+r*ch+ch/2);
      columns.forEach((column,c)=>{const record=map.get(`${id}\u0000${column}`);const value=record?(metric==="length"?record.length/Math.SQRT2:record[metric]):null;ctx.fillStyle=value==null?"#f0f2f3":greenScale(value);ctx.fillRect(margin.left+c*cw,margin.top+r*ch,Math.max(1,cw-1),Math.max(1,ch-1));if(record)state.results.chartPoints.push({x:margin.left+c*cw+cw/2,y:margin.top+r*ch+ch/2,r:Math.max(5,Math.min(cw,ch)/2),record});});
    });
    $("#chartLegend").innerHTML='<span class="legend-item">0&nbsp; <i style="display:inline-block;width:90px;height:9px;background:linear-gradient(90deg,#eef8fc,#37c0fb)"></i>&nbsp; 1</span>';
  }

  function drawHistogram(ctx,w,h,records) {
    const focus=$("#metricFocus").value,normalize=$("#normalizeLength").checked;
    const max=focus==="length"&&!normalize?Math.SQRT2:1,bins=24,counts=new Array(bins).fill(0);let valueCount=0;
    for(const record of records){const value=focus==="tl"?record.tl:focus==="il"?record.il:focus==="coverage"?record.coverage:focus==="dispersion"?record.dispersion:(normalize?record.length/Math.SQRT2:record.length);if(!Number.isFinite(value))continue;counts[Math.min(bins-1,Math.max(0,Math.floor(value/max*bins)))]++;valueCount++;}
    chartBase(ctx,w,h,"Metric histogram",`${focus==="tl"?"Void Tolerance":focus==="il"?"Imperviousness":focus==="coverage"?"Support coverage λ/|G|":focus==="dispersion"?"Dispersion efficiency λ/δ":normalize?"Normalized vector length":"Euclidean vector length"} · n=${valueCount.toLocaleString()}`);
    const margin={left:60,right:25,top:30,bottom:55},pw=w-margin.left-margin.right,ph=h-margin.top-margin.bottom,peak=Math.max(1,...counts),bw=pw/bins;
    ctx.strokeStyle="#dfe3e6";for(const value of [0,.5,1]){const y=margin.top+ph*(1-value);ctx.beginPath();ctx.moveTo(margin.left,y);ctx.lineTo(w-margin.right,y);ctx.stroke();ctx.fillStyle="#69757e";ctx.textAlign="right";ctx.fillText(Math.round(peak*value).toString(),margin.left-8,y);}
    counts.forEach((count,i)=>{const bh=count/peak*ph,x=margin.left+i*bw+1,y=margin.top+ph-bh,width=Math.max(1,bw-2),from=max*i/bins,to=max*(i+1)/bins;ctx.fillStyle="#37c0fb";ctx.fillRect(x,y,width,bh);state.results.chartPoints.push({x:x+width/2,y:y+bh/2,r:Math.max(width/2,6),bounds:{x,y,w:width,h:Math.max(bh,2)},histogram:{from,to,count,valueCount}});});
    for(const value of [0,.5,1]){ctx.fillStyle="#69757e";ctx.textAlign="center";ctx.fillText(fmt(max*value,2),margin.left+pw*value,h-25);}
    $("#chartLegend").innerHTML='<span class="legend-item"><i class="legend-swatch" style="background:#37c0fb"></i>Record count</span>';
  }

  function renderChartLegend(records) {
    const mode=$("#colorBy").value;
    let items=[];
    if(mode==="classification")items=[{name:"Decentralized",color:"#37c0fb"},{name:"Centralized",color:"#c53737"},{name:"Aggregate",color:"#282a35"}];
    else if(mode==="subject")items=[...new Map(records.map((record,i)=>[record.kind==="aggregate"?"Aggregate":record.name,{name:record.kind==="aggregate"?"Aggregate":record.name,color:colorForRecord(record,i)}])).values()].slice(0,10);
    else items=[...new Map(records.map((record,i)=>[record.systemId,{name:record.systemName,color:colorForRecord(record,i)}])).values()].slice(0,8);
    $("#chartLegend").innerHTML=items.map(item=>`<span class="legend-item"><i class="legend-swatch" style="background:${esc(item.color)}"></i>${esc(item.name.length>24?item.name.slice(0,22)+"…":item.name)}</span>`).join("")+(items.length>=10?'<span class="legend-item">…</span>':"");
  }

  function greenScale(value){value=clamp(value,0,1);const a=[238,248,252],b=[55,192,251];return `rgb(${Math.round(a[0]+(b[0]-a[0])*value)},${Math.round(a[1]+(b[1]-a[1])*value)},${Math.round(a[2]+(b[2]-a[2])*value)})`;}
  function hexAlpha(hex,alpha){if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${alpha})`;}

  function filteredSortedTableRecords(records) {
    const query=$("#resultSearch").value.trim().toLowerCase();
    let rows=query?records.filter(record=>`${record.systemName} ${record.name} ${record.classification} ${record.distribution}`.toLowerCase().includes(query)):records;
    const sort=$("#resultSort").value;
    if(sort!=="system")rows=rows.slice();
    if(sort==="length-desc")rows.sort((a,b)=>b.length-a.length);
    else if(sort==="length-asc")rows.sort((a,b)=>a.length-b.length);
    else if(sort==="tl-desc")rows.sort((a,b)=>b.tl-a.tl);
    else if(sort==="il-desc")rows.sort((a,b)=>b.il-a.il);
    return rows;
  }

  function renderResultsTable(records) {
    const rows=filteredSortedTableRecords(records),pages=Math.max(1,Math.ceil(rows.length/TABLE_PAGE_SIZE));state.results.page=clamp(state.results.page,1,pages);
    const start=(state.results.page-1)*TABLE_PAGE_SIZE,pageRows=rows.slice(start,start+TABLE_PAGE_SIZE),normalize=$("#normalizeLength").checked;
    $("#tableCount").textContent=`${rows.length.toLocaleString()} row${rows.length===1?"":"s"}`;
    $("#resultsTableBody").innerHTML=pageRows.map(record=>`<tr><td>${esc(record.systemName)}</td><td>${record.kind==="aggregate"?'<span class="row-badge aggregate">Aggregate</span>':esc(record.name)}</td><td class="vector-cell">[${fmt(record.tl)}, ${fmt(record.il)}]</td><td>${fmt(normalize?record.length/Math.SQRT2:record.length)}${normalize?" norm.":""}</td><td><span class="row-badge ${record.kind==="aggregate"?"aggregate":record.classification==="Decentralized"?"decentral":"central"}">${esc(record.classification)}</span></td><td>${esc(record.distribution)}</td><td>${record.delta??"—"}</td><td>${record.lambda??"—"}</td><td>${record.mu??"—"}</td><td>${fmt(record.coverage)}</td><td>${fmt(record.dispersion)}</td><td>${record.rv??"—"}</td><td>${record.gs??"—"}</td><td>${record.re??"—"}</td><td>${record.epsilon??"—"}</td><td><button class="mini-btn" data-preview-system="${esc(record.systemId)}" type="button">Preview</button> <button class="mini-btn" data-explain-system="${esc(record.systemId)}" type="button">Explain</button>${record.systemSource==="simulation"&&record.n<=EXACT_PREVIEW_LIMIT&&record.m<=EXACT_PREVIEW_EDGE_LIMIT?` <button class="mini-btn" data-load-system="${esc(record.systemId)}" type="button">Load</button>`:""}</td></tr>`).join("")||'<tr><td colspan="16" class="muted">No records match these display filters.</td></tr>';
    $("#pageIndicator").textContent=`Page ${state.results.page} of ${pages}`;$("#prevPageBtn").disabled=state.results.page<=1;$("#nextPageBtn").disabled=state.results.page>=pages;
  }

  function renderAnalysisSelector() {
    const select=$("#analysisSystemSelect"),systems=batchEvaluations();
    const visible=limitedSystemOptions(systems,state.results.selectedSystem),omitted=Math.max(0,systems.length-visible.length);
    select.innerHTML=visible.map(item=>`<option value="${esc(item.id)}" ${item.id===state.results.selectedSystem?"selected":""}>${esc(item.name)}</option>`).join("")+(omitted?`<option disabled>… ${omitted.toLocaleString()} more — use table Explain</option>`:"");
  }

  function renderAnalysis(systemId,target=$("#analysisContent"),evaluations=batchEvaluations(),syncSelection=true) {
    const system=evaluations.find(item=>item.id===systemId)||evaluations[0];
    if(!system)return;
    if(syncSelection){state.results.selectedSystem=system.id;if($("#analysisSystemSelect"))$("#analysisSystemSelect").value=system.id;}
    const greatest=system.subjects.slice().sort((a,b)=>b.length-a.length)[0],least=system.subjects.slice().sort((a,b)=>a.length-b.length)[0];
    const relative=relativeAggregateClaim(system,evaluations);
    const profile=system.distributionProfile;
    const intro=`<strong>${esc(system.systemClass)}</strong> · dim=${system.dimensionality}/${system.subjectCount}. A(Eₛ)=<strong>[${fmt(system.aggregate.tl)}, ${fmt(system.aggregate.il)}]</strong>; |A(Eₛ)|=<strong>${fmt(system.aggregate.length)}</strong>. ${relative}`;
    const cards=system.subjects.map(item=>{
      const ontology=`Ontology: ${item.classification.toLowerCase()} because µ(pᵤ,a)=${item.mu}${item.mu===1?"":" > 1"}; independently ${item.distribution.toLowerCase()} because λ=${item.lambda}.`;
      const voidText=item.mu===1?"Proposition 1: anchor-centralized zero case µ=1.":item.rv===0?"Proposition 1: rᵥ=0, hence Tₗ=1.":`Proposition 1: rᵥ=${item.rv}, |Gₛ|=${item.gs}, ε=${fmt(item.epsilon,2)} → Tₗ=${fmt(item.tl)}.`;
      const impText=item.mu===1?"Proposition 2: anchor-centralized zero case µ=1.":system.m===0?"Proposition 2: zero case |E|=0.":item.re===0?"Proposition 2: rₑ=0 implementation extension → Iₗ=0.":item.re===system.n-1&&item.lambda>1?"Proposition 2: upper case → Iₗ=1.":`Proposition 2: λ=${item.lambda}, rₑ=${item.re}, ε=${fmt(item.epsilon,2)} → Iₗ=${fmt(item.il)}.`;
      return `<article class="subject-analysis" style="--subject-color:${esc(item.color)}"><div class="subject-analysis-head"><div><h3>${esc(item.name)}</h3><p>δ=${item.delta} · λ=${item.lambda} · µ=${item.mu} · coverage=${fmt(item.coverage*100,1)}%</p></div><span class="vector-display">[${fmt(item.tl)}, ${fmt(item.il)}] · ${fmt(item.length)}</span></div><ul class="evidence-list"><li>${ontology}</li><li>${voidText}</li><li>${impText}</li></ul></article>`;
    }).join("");
    const distributionRows=system.subjects.map(item=>`<div class="distribution-row" style="--subject-color:${esc(item.color)}"><span class="distribution-row-label">${esc(item.name)}</span><span class="distribution-track" title="λ/δ = ${fmt(item.dispersion,3)}"><i class="spread" style="width:${clamp(item.dispersion*100,0,100)}%"></i><i class="colocated" style="width:${clamp((1-item.dispersion)*100,0,100)}%"></i></span><small>${item.distribution}: λ=${item.lambda}; δ−λ=${item.colocated}; λ/δ=${fmt(item.dispersion,3)}</small></div>`).join("");
    const systemDistributionReason=profile.unionSupport>1?`Union support is ${profile.unionSupport}>1.`:"Union support is one vertex.";
    const randomization=system.metadata?.randomization,simulationTrace=randomization?`<p class="simulation-trace"><strong>Generated:</strong> ${esc(topologyName(system.metadata.type))}; ${esc(randomization.nodeDistribution||"uniform")} order; ±${fmt(randomization.parameterJitter,1)}% jitter.</p>`:"";
    const distributionSection=`<section class="distribution-analysis"><div class="distribution-analysis-head"><div><h3>Distribution basis</h3><p>${systemDistributionReason} Bars show λ and co-located δ−λ.</p></div><span class="row-badge ${profile.unionSupport>1?"decentral":"central"}">${esc(system.systemDistribution)}</span></div><div class="distribution-summary"><div><small>Union support</small><strong>${profile.unionSupport}/${system.n} · ${fmt(profile.unionCoverage*100,1)}%</strong></div><div><small>Co-located excess</small><strong>${profile.colocatedRealizations}</strong></div><div><small>Shared vertices</small><strong>${profile.sharedSupportVertices}</strong></div></div><div class="distribution-rows">${distributionRows}</div>${simulationTrace}</section>`;
    const warnings=["Claims depend on the declared subject–anchor profile, completed center families, and this fixed-time snapshot.","A(Eₛ) is an equal element-wise profile mean; ε acts inside each proposition."];
    if(system.componentCount>1)warnings.push(`${system.componentCount} components: component-forest handling is an implementation extension.`);
    target.innerHTML=`<div class="analysis-overview"><div class="analysis-stat"><small>Ontology</small><strong>${esc(system.systemClass)}</strong></div><div class="analysis-stat"><small>Largest |d⃗|</small><strong>${esc(greatest?.name||"—")} · ${fmt(greatest?.length)}</strong></div><div class="analysis-stat"><small>Smallest |d⃗|</small><strong>${esc(least?.name||"—")} · ${fmt(least?.length)}</strong></div></div><div class="analysis-intro"><p>${intro}</p></div>${distributionSection}<div class="subject-analysis-list">${cards}</div><div class="guardrails"><h3>Scope</h3><ul>${warnings.map(text=>`<li>${esc(text)}</li>`).join("")}</ul></div>`;
  }

  function relativeAggregateClaim(system,pool=batchEvaluations()) {
    const peers=pool.filter(item=>item.id!==system.id&&sameSubjectProfile(item,system));
    if(!peers.length)return "No matching subject–anchor profile; no relative length claim.";
    const lower=peers.filter(item=>item.aggregate.length<system.aggregate.length-EPS).length;
    const higher=peers.filter(item=>item.aggregate.length>system.aggregate.length+EPS).length;
    return `Matching-profile peers: higher than ${lower}, lower than ${higher}, tied with ${peers.length-lower-higher}.`;
  }

  function sameSubjectProfile(a,b){const x=a.subjects.map(item=>item.name).sort(),y=b.subjects.map(item=>item.name).sort();return x.length===y.length&&x.every((name,i)=>name===y[i]);}

  function handleChartPointer(event) {
    const canvas=$("#resultsChart"),rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
    let best=null,bestDistance=Infinity;
    for(const point of state.results.chartPoints){const inside=point.bounds&&x>=point.bounds.x&&x<=point.bounds.x+point.bounds.w&&y>=point.bounds.y&&y<=point.bounds.y+point.bounds.h,distance=inside?0:Math.hypot(point.x-x,point.y-y);if((inside||distance<point.r+5)&&distance<bestDistance){best=point;bestDistance=distance;}}
    const tip=$("#chartTooltip");
    if(!best){tip.classList.add("hidden");return;}
    if(best.histogram){const bin=best.histogram;tip.classList.remove("hidden");tip.style.left=`${clamp(best.x+12,8,rect.width-250)}px`;tip.style.top=`${clamp(best.y-20,8,rect.height-80)}px`;tip.innerHTML=`<strong>${fmt(bin.from,3)}–${fmt(bin.to,3)}</strong><br>${bin.count.toLocaleString()} records · ${fmt(bin.count/Math.max(1,bin.valueCount)*100,1)}%`;return;}
    const r=best.record,type=$("#chartType").value,distributionLine=`coverage=${fmt(r.coverage)}, λ/δ=${fmt(r.dispersion)}${r.kind==="subject"?` · ${esc(r.distribution)}`:""}`;
    tip.classList.remove("hidden");tip.style.left=`${clamp(x+12,8,rect.width-250)}px`;tip.style.top=`${clamp(y-20,8,rect.height-105)}px`;tip.innerHTML=`<strong>${esc(r.systemName)}</strong><br>${esc(r.name)} · ${esc(r.classification)}<br>${type==="distribution"||type==="composition"?distributionLine:`d⃗=[${fmt(r.tl)}, ${fmt(r.il)}], |d⃗|=${fmt(r.length)}<br>${distributionLine}`}`;
  }

  function handleSharedChartPointer(event) {
    const canvas=event.currentTarget,rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,tip=$("#sharedChartTooltip");let best=null,distance=Infinity;
    for(const point of state.results.sharedPoints){const next=Math.hypot(point.x-x,point.y-y);if(next<point.r&&next<distance){best=point;distance=next;}}
    if(!best){tip.classList.add("hidden");return;}tip.classList.remove("hidden");tip.style.left=`${clamp(best.x+12,8,rect.width-245)}px`;tip.style.top=`${clamp(best.y-20,8,rect.height-90)}px`;tip.innerHTML=`<strong>${esc(best.label)} = ${esc(best.group.key)}</strong><br>${best.group.count.toLocaleString()} profile-entry records · ${best.group.systemCount.toLocaleString()} systems`;
  }

  function handleSimulationChartPointer(event) {
    const canvas=event.currentTarget,rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,tip=$("#simulationChartTooltip"),point=state.simulation.previewPoints.find(item=>x>=item.x&&x<=item.x+item.w&&y>=item.y&&y<=item.y+item.h);
    if(!point){tip.classList.add("hidden");return;}tip.classList.remove("hidden");tip.style.left=`${clamp(point.x+point.w/2+10,8,rect.width-255)}px`;tip.style.top=`${clamp(point.y-12,8,rect.height-75)}px`;tip.innerHTML=`<strong>${esc(point.label)}</strong><br>${esc(point.detail)}`;
  }

  function resetDisplay() {
    $("#resultScope").value="all";$("#chartType").value="vectors";$("#colorBy").value="subject";$("#classFilter").value="all";$("#metricFocus").value="length";
    $("#showSubjects").checked=false;$("#showAggregate").checked=true;$("#showVectorLines").checked=false;$("#showLabels").checked=false;$("#normalizeLength").checked=false;
    Object.keys(state.results.subjectEnabled).forEach(key=>state.results.subjectEnabled[key]=true);state.results.page=1;renderResults();
  }

  function exportResultsCsv() {
    const records=resultRecords();
    if(!records.length){toast("There are no visible result records to export.","warning");return;}
    const headers=["system_id","system","source","profile_entry","subject","anchor","record_type","tl","il","vector_length_l2","ontology_class","distribution","delta","lambda","mu","support_coverage","dispersion_efficiency","colocated_excess","rv","gs","re","epsilon","vertices","edges"];
    const rows=records.map(r=>[r.systemId,r.systemName,r.systemSource,r.name,r.subjectName??"",r.anchor??"",r.kind,r.tl,r.il,r.length,r.classification,r.distribution,r.delta??"",r.lambda??"",r.mu??"",r.coverage??"",r.dispersion??"",r.colocated??"",r.rv??"",r.gs??"",r.re??"",r.epsilon??"",r.n,r.m]);
    const csv=[headers,...rows].map(row=>row.map(csvCell).join(",")).join("\r\n");downloadBlob("decentralization-evaluation-results.csv",csv,"text/csv;charset=utf-8");
  }

  function csvCell(value){const text=String(value??"");return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}

  function exportResultsJson() {
    const evaluations=batchEvaluations();
    if(!evaluations.length){toast("There are no evaluations to export.","warning");return;}
    const payload={schema:"decentralization-ontology-results/v2",exportedAt:nowIso(),source:PAPER_CITATION,vectorLength:"Euclidean L2",aggregate:"Equal element-wise arithmetic mean over E_s",systems:evaluations};
    downloadBlob("decentralization-evaluation-results.json",JSON.stringify(payload,null,2),"application/json");
  }

  function toast(message,type="info",duration=4200) {
    const region=$("#toastRegion"),element=document.createElement("div");
    element.className=`toast ${type}`;element.textContent=message;region.appendChild(element);
    requestAnimationFrame(()=>element.classList.add("show"));
    setTimeout(()=>{element.classList.remove("show");setTimeout(()=>element.remove(),220);},duration);
  }
