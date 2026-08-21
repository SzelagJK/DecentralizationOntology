"use strict";

  const REALISTIC_CENTER_MODELS = {
    ownership: ["few-actors","few-actors","topological","single-operator","singleton"],
    authority: ["single-operator","few-actors","hub-led","overlapping-consortium","singleton"],
    trust: ["few-actors","topological","overlapping-consortium","singleton"],
    governance: ["single-operator","few-actors","overlapping-consortium","singleton"],
    custom: ["few-actors","topological","overlapping-consortium","single-operator","singleton"]
  };

  const CENTER_NAME_STEMS = {
    ownership: ["Primary operator","Client organization","Independent operator","Infrastructure provider","Community operator","Regional owner"],
    authority: ["Platform operator","Regional administrator","Consortium member","Service authority","Protocol operator","Local administrator"],
    trust: ["Root of trust","Trust domain","Certification authority","Validator set","Local trust root","Federated trust domain"],
    governance: ["Steering council","Protocol foundation","Member consortium","Operations committee","Regional council","Participant assembly"],
    custom: ["Actor","Domain","Center","Operator","Member","Region"]
  };

  function anchorDefinition(anchor) {
    return ANCHOR_CATALOG[anchor?.type]||ANCHOR_CATALOG.custom;
  }

  function ensureActiveAnchor() {
    if(!state.anchors.length){
      state.anchors.push({id:"authority",name:"Authority",type:"authority",color:SUBJECT_COLORS[1],regions:[]});
    }
    if(!state.anchors.some(anchor=>anchor.id===state.activeAnchorId))state.activeAnchorId=state.anchors[0].id;
    return getAnchor(state.activeAnchorId);
  }

  function renderEditorPane() {
    const profile=$("#profileEditorPane"),anchors=$("#anchorEditorPane");
    if(!profile||!anchors)return;
    const anchorMode=state.editorPane==="anchors";
    profile.classList.toggle("hidden",anchorMode);
    anchors.classList.toggle("hidden",!anchorMode);
    $$("[data-editor-pane]").forEach(button=>{
      const active=button.dataset.editorPane===state.editorPane;
      button.classList.toggle("active",active);
      button.setAttribute("aria-selected",String(active));
    });
  }

  function setEditorPane(pane) {
    state.editorPane=pane==="anchors"?"anchors":"profile";
    renderEditorPane();
    if(state.editorPane==="anchors")renderAnchors();
  }

  function renderCanvasAnchorBar() {
    const host=$("#centerCanvasBar");
    if(!host)return;
    const active=ensureActiveAnchor();
    const options=state.anchors.map(anchor=>`<option value="${esc(anchor.id)}" ${anchor.id===active.id?"selected":""}>${esc(anchor.name)}</option>`).join("");
    const family=buildAnchorCenterFamilies([active],state.graph.nodes.map(node=>node.id)).get(active.id);
    const explicit=(active.regions||[]).length;
    const singleton=state.graph.nodes.filter(node=>family?.get(node.id)?.[0]===`vertex:${node.id}`).length;
    let assignment="";
    if(state.assignCenter?.anchorId===active.id){
      const region=(active.regions||[]).find(item=>item.id===state.assignCenter.regionId);
      if(region)assignment=`<span class="center-assign-status"><i style="background:${esc(region.color)}"></i>Assigning ${esc(region.name)} · click vertices</span><button class="mini-btn" data-stop-center-assignment type="button">Done</button>`;
    }
    host.innerHTML=`<label>Center overlay <select id="canvasAnchorSelect">${options}</select></label><span class="center-family-summary">${explicit} explicit center${explicit===1?"":"s"} · ${singleton} singleton-completed</span>${assignment}<button class="mini-btn" data-open-centers type="button">Edit centers</button>`;
  }

  function renderAnchors() {
    const host=$("#anchorList");
    if(!host)return;
    ensureActiveAnchor();
    host.innerHTML=state.anchors.map(anchor=>{
      const definition=anchorDefinition(anchor);
      const active=anchor.id===state.activeAnchorId;
      const family=buildAnchorCenterFamilies([anchor],state.graph.nodes.map(node=>node.id)).get(anchor.id);
      const singletonCount=state.graph.nodes.filter(node=>family?.get(node.id)?.[0]===`vertex:${node.id}`).length;
      const typeOptions=Object.entries(ANCHOR_CATALOG).map(([key,value])=>`<option value="${key}" ${anchor.type===key?"selected":""}>${esc(value.label)}</option>`).join("");
      const regions=(anchor.regions||[]).map((region,index)=>{
        const assigning=state.assignCenter?.anchorId===anchor.id&&state.assignCenter?.regionId===region.id;
        const members=(region.vertices||[]).map(id=>state.graph.nodes.find(node=>node.id===id)?.label||id);
        return `<div class="center-region-row ${assigning?"assigning":""}" style="--center-color:${esc(region.color)}" data-region-row="${esc(region.id)}">
          <input class="center-region-color" data-anchor-field="region-color" data-anchor-id="${esc(anchor.id)}" data-region-id="${esc(region.id)}" type="color" value="${esc(region.color)}" aria-label="Center color">
          <div class="center-region-main"><input class="center-region-name" data-anchor-field="region-name" data-anchor-id="${esc(anchor.id)}" data-region-id="${esc(region.id)}" value="${esc(region.name)}" aria-label="Center name"><span>${members.length?`${members.length} member${members.length===1?"":"s"}: ${esc(members.slice(0,5).join(", "))}${members.length>5?"…":""}`:"No vertices — empty region"}</span></div>
          <button class="mini-btn ${assigning?"active":""}" data-anchor-action="assign-region" data-anchor-id="${esc(anchor.id)}" data-region-id="${esc(region.id)}" type="button">${assigning?"Done":"Paint"}</button>
          <button class="icon-btn" data-anchor-action="delete-region" data-anchor-id="${esc(anchor.id)}" data-region-id="${esc(region.id)}" type="button" aria-label="Delete ${esc(region.name)}">×</button>
        </div>`;
      }).join("");
      return `<section class="anchor-card ${active?"active":""}" style="--anchor-color:${esc(anchor.color)}" data-anchor-card="${esc(anchor.id)}">
        <div class="anchor-card-head"><input class="anchor-color" data-anchor-field="color" data-anchor-id="${esc(anchor.id)}" type="color" value="${esc(anchor.color)}" aria-label="Anchor color"><input class="anchor-name" data-anchor-field="name" data-anchor-id="${esc(anchor.id)}" value="${esc(anchor.name)}" aria-label="Anchor interpretation"><button class="mini-btn" data-anchor-action="show-anchor" data-anchor-id="${esc(anchor.id)}" type="button">${active?"Shown on canvas":"Show"}</button><button class="mini-btn remove" data-anchor-action="delete-anchor" data-anchor-id="${esc(anchor.id)}" type="button">Delete</button></div>
        <label class="anchor-type-field">Interpretation example<select data-anchor-field="type" data-anchor-id="${esc(anchor.id)}">${typeOptions}</select></label>
        <p class="anchor-definition">${esc(definition.description)} <strong>Contextual input:</strong> the catalogue suggests realistic language; it does not add fixed anchor subclasses to the ontology.</p>
        <div class="center-family-head"><div><strong>Center family C<sub>a</sub></strong><span>${(anchor.regions||[]).length} explicit · ${singletonCount} singleton-completed · overlap allowed</span></div><button class="mini-btn" data-anchor-action="add-region" data-anchor-id="${esc(anchor.id)}" type="button">+ Center</button></div>
        <div class="center-quick-actions"><button class="mini-btn" data-anchor-action="singleton" data-anchor-id="${esc(anchor.id)}" type="button">Every vertex independent</button><button class="mini-btn" data-anchor-action="shared" data-anchor-id="${esc(anchor.id)}" type="button">One operator</button><label>Actors <input data-center-count="${esc(anchor.id)}" type="number" min="2" max="20" value="${Math.max(2,Math.min(6,(anchor.regions||[]).length||3))}"></label><button class="mini-btn" data-anchor-action="split" data-anchor-id="${esc(anchor.id)}" type="button">Split actors</button><button class="mini-btn primary-lite" data-anchor-action="randomize" data-anchor-id="${esc(anchor.id)}" type="button">Realistic random</button></div>
        <div class="center-region-list">${regions||'<div class="center-empty">No explicit regions. Under the paper\'s completion convention, each uncovered vertex is its own singleton center.</div>'}</div>
      </section>`;
    }).join("");
    renderCanvasAnchorBar();
    renderEditorPane();
  }

  function addAnchor(type="custom") {
    pushHistory();
    const definition=ANCHOR_CATALOG[type]||ANCHOR_CATALOG.custom;
    const used=new Set(state.anchors.map(anchor=>anchor.id));
    const id=uniqueId(slugify(definition.label),used);
    state.anchors.push({id,name:definition.label,type:ANCHOR_CATALOG[type]?type:"custom",color:SUBJECT_COLORS[state.anchors.length%SUBJECT_COLORS.length],regions:[]});
    state.activeAnchorId=id;
    state.editorPane="anchors";
    invalidateEvaluation();
    syncSimulationTemplates(false);
    refreshWorkspace();
    toast(`Added ${definition.label} as a contextual anchor interpretation.`);
  }

  function deleteAnchor(anchorId) {
    const anchor=getAnchor(anchorId);
    if(!anchor)return;
    if(state.anchors.length===1){toast("A model needs at least one anchor interpretation.","warning");return;}
    const usedBy=state.subjects.filter(item=>item.anchorId===anchorId);
    pushHistory();
    state.anchors=state.anchors.filter(item=>item.id!==anchorId);
    const replacement=state.anchors[0];
    for(const item of usedBy){item.anchorId=replacement.id;item.anchor=replacement.name;}
    if(state.activeAnchorId===anchorId)state.activeAnchorId=replacement.id;
    if(state.assignCenter?.anchorId===anchorId){state.assignCenter=null;setTool("select",false);}
    invalidateEvaluation();syncSimulationTemplates(false);refreshWorkspace();
    toast(`Removed ${anchor.name}; ${usedBy.length} profile entr${usedBy.length===1?"y was":"ies were"} reassigned to ${replacement.name}.`,"warning");
  }

  function addCenterRegion(anchorId,options={}) {
    const anchor=getAnchor(anchorId);if(!anchor)return null;
    const used=new Set((anchor.regions||[]).map(region=>region.id));
    const definition=anchorDefinition(anchor),index=(anchor.regions||[]).length;
    const name=options.name||`${definition.noun} ${index+1}`;
    const id=uniqueId(`${anchor.id}-${slugify(name,"center")}`,used);
    const region={id,name,color:options.color||CENTER_COLORS[index%CENTER_COLORS.length],vertices:[...new Set((options.vertices||[]).map(String))]};
    anchor.regions||=[];anchor.regions.push(region);return region;
  }

  function beginCenterAssignment(anchorId,regionId) {
    if(state.assignCenter?.anchorId===anchorId&&state.assignCenter?.regionId===regionId){state.assignCenter=null;setTool("select");return;}
    state.activeAnchorId=anchorId;
    state.assignCenter={anchorId,regionId};
    state.assignSubjectId=null;
    setTool("center");
    state.editorPane="anchors";
    renderAnchors();
  }

  function toggleCenterVertex(anchorId,regionId,vertexId) {
    const anchor=getAnchor(anchorId),region=anchor?.regions?.find(item=>item.id===regionId);if(!region)return;
    pushHistory();
    const index=region.vertices.indexOf(vertexId);
    if(index>=0)region.vertices.splice(index,1);else region.vertices.push(vertexId);
    invalidateEvaluation();refreshWorkspace();
  }

  function graphDistances(start) {
    const adjacency=new Map(state.graph.nodes.map(node=>[node.id,[]]));
    for(const edge of state.graph.edges){adjacency.get(edge.a)?.push(edge.b);adjacency.get(edge.b)?.push(edge.a);}
    const distances=new Map([[start,0]]),queue=[start];
    for(let cursor=0;cursor<queue.length;cursor++)for(const next of adjacency.get(queue[cursor])||[])if(!distances.has(next)){distances.set(next,distances.get(queue[cursor])+1);queue.push(next);}
    return distances;
  }

  function actorPartition(count,randomize=false) {
    const nodes=state.graph.nodes;if(!nodes.length)return [];
    count=clamp(Math.round(count),1,nodes.length);
    const degree=new Map(nodes.map(node=>[node.id,0]));
    for(const edge of state.graph.edges){degree.set(edge.a,(degree.get(edge.a)||0)+1);degree.set(edge.b,(degree.get(edge.b)||0)+1);}
    const candidates=[...nodes].sort((a,b)=>(degree.get(b.id)||0)-(degree.get(a.id)||0));
    const seeds=[];
    if(randomize)shuffleInPlace(candidates,Math.random);
    while(seeds.length<count&&candidates.length){
      if(!seeds.length)seeds.push(candidates.shift());
      else{
        const scored=candidates.map(node=>({node,score:Math.min(...seeds.map(seed=>Math.hypot(node.x-seed.x,node.y-seed.y)))+Math.random()*20})).sort((a,b)=>b.score-a.score);
        const selected=scored[0].node;seeds.push(selected);candidates.splice(candidates.indexOf(selected),1);
      }
    }
    const distances=seeds.map(seed=>graphDistances(seed.id));
    const groups=Array.from({length:seeds.length},()=>[]);
    for(const node of nodes){
      let best=0,bestDistance=Infinity;
      for(let index=0;index<seeds.length;index++){
        const graphDistance=distances[index].get(node.id);
        const distance=graphDistance==null?10000+Math.hypot(node.x-seeds[index].x,node.y-seeds[index].y):graphDistance;
        if(distance<bestDistance||(distance===bestDistance&&Math.random()<.5)){best=index;bestDistance=distance;}
      }
      groups[best].push(node.id);
    }
    return groups;
  }

  function applyCenterModel(anchorId,model,count=3,randomize=false) {
    const anchor=getAnchor(anchorId);if(!anchor)return;
    const nodes=state.graph.nodes;
    anchor.regions=[];
    if(model==="singleton"||!nodes.length)return;
    if(model==="single-operator"){
      addCenterRegion(anchorId,{name:CENTER_NAME_STEMS[anchor.type]?.[0]||"Shared operator",vertices:nodes.map(node=>node.id)});return;
    }
    const maxCount=Math.min(nodes.length,Math.max(2,Number(count)||3));
    const groups=actorPartition(maxCount,randomize);
    const stems=CENTER_NAME_STEMS[anchor.type]||CENTER_NAME_STEMS.custom;
    groups.forEach((vertices,index)=>addCenterRegion(anchorId,{name:index?`${stems[index%stems.length]} ${index+1}`:stems[0],vertices}));
    if(model==="hub-led"&&anchor.regions.length>1){
      const degree=new Map(nodes.map(node=>[node.id,0]));for(const edge of state.graph.edges){degree.set(edge.a,(degree.get(edge.a)||0)+1);degree.set(edge.b,(degree.get(edge.b)||0)+1);}
      const hubs=[...nodes].sort((a,b)=>degree.get(b.id)-degree.get(a.id)).slice(0,Math.max(1,Math.ceil(nodes.length*.2))).map(node=>node.id);
      anchor.regions[0].vertices=[...new Set([...anchor.regions[0].vertices,...hubs])];
    }
    if(model==="overlapping-consortium"&&anchor.regions.length>1){
      const overlapCount=Math.max(1,Math.round(nodes.length*.2));
      const shuffled=shuffleInPlace(nodes.map(node=>node.id),Math.random);
      for(let index=0;index<overlapCount;index++){
        const vertex=shuffled[index],first=index%anchor.regions.length,second=(first+1)%anchor.regions.length;
        if(!anchor.regions[first].vertices.includes(vertex))anchor.regions[first].vertices.push(vertex);
        if(!anchor.regions[second].vertices.includes(vertex))anchor.regions[second].vertices.push(vertex);
      }
    }
  }

  function randomizeAnchorCenters(anchorId,record=true) {
    const anchor=getAnchor(anchorId);if(!anchor)return;
    if(record)pushHistory();
    const models=REALISTIC_CENTER_MODELS[anchor.type]||REALISTIC_CENTER_MODELS.custom;
    const model=models[Math.floor(Math.random()*models.length)];
    const n=state.graph.nodes.length;
    const count=n<4?Math.max(1,n):clamp(2+Math.floor(Math.random()*Math.min(5,Math.max(1,n-1))),2,n);
    applyCenterModel(anchorId,model,count,true);
    state.activeAnchorId=anchorId;state.assignCenter=null;
    invalidateEvaluation();refreshWorkspace();
    if(record)toast(`${anchor.name}: generated ${model.replaceAll("-"," ")} centers. This is a disclosed modeling heuristic, not a claim from the paper.`);
  }

  function randomizeAllAnchorCenters() {
    if(!state.anchors.length)return;
    pushHistory();
    for(const anchor of state.anchors)randomizeAnchorCenters(anchor.id,false);
    invalidateEvaluation();refreshWorkspace();
    toast("Randomized every system-level center family using anchor-specific actor/domain heuristics.");
  }

  function handleAnchorEditorClick(event) {
    const pane=event.target.closest("[data-editor-pane]");if(pane)return setEditorPane(pane.dataset.editorPane);
    if(event.target.closest("[data-add-anchor]"))return addAnchor($("#newAnchorType")?.value||"custom");
    if(event.target.closest("[data-randomize-anchors]"))return randomizeAllAnchorCenters();
    const button=event.target.closest("[data-anchor-action]");if(!button)return;
    const anchorId=button.dataset.anchorId,regionId=button.dataset.regionId,action=button.dataset.anchorAction;
    const anchor=getAnchor(anchorId);if(!anchor)return;
    if(action==="show-anchor"){state.activeAnchorId=anchorId;renderGraph();renderAnchors();return;}
    if(action==="delete-anchor")return deleteAnchor(anchorId);
    if(action==="add-region"){pushHistory();const region=addCenterRegion(anchorId);invalidateEvaluation();refreshWorkspace();return beginCenterAssignment(anchorId,region.id);}
    if(action==="delete-region"){pushHistory();anchor.regions=anchor.regions.filter(region=>region.id!==regionId);if(state.assignCenter?.regionId===regionId){state.assignCenter=null;setTool("select",false);}invalidateEvaluation();refreshWorkspace();return;}
    if(action==="assign-region")return beginCenterAssignment(anchorId,regionId);
    if(action==="singleton"){pushHistory();applyCenterModel(anchorId,"singleton");state.activeAnchorId=anchorId;invalidateEvaluation();refreshWorkspace();return;}
    if(action==="shared"){pushHistory();applyCenterModel(anchorId,"single-operator");state.activeAnchorId=anchorId;invalidateEvaluation();refreshWorkspace();return;}
    if(action==="split"){pushHistory();applyCenterModel(anchorId,"topological",Number($(`[data-center-count="${CSS.escape(anchorId)}"]`)?.value||3));state.activeAnchorId=anchorId;invalidateEvaluation();refreshWorkspace();return;}
    if(action==="randomize")return randomizeAnchorCenters(anchorId);
  }

  function handleAnchorEditorInput(event) {
    const target=event.target.closest("[data-anchor-field]");if(!target)return;
    const anchor=getAnchor(target.dataset.anchorId);if(!anchor)return;
    const field=target.dataset.anchorField;
    if(field==="name"){
      anchor.name=target.value;
      for(const subject of state.subjects)if(subject.anchorId===anchor.id)subject.anchor=anchor.name;
    }else if(field==="type")anchor.type=target.value;
    else if(field==="color")anchor.color=target.value;
    else{
      const region=anchor.regions?.find(item=>item.id===target.dataset.regionId);if(!region)return;
      if(field==="region-name")region.name=target.value;else if(field==="region-color")region.color=target.value;
    }
    invalidateEvaluation();renderGraph();renderSubjects();renderLegend();renderValidation();renderCanvasAnchorBar();
  }

  function handleAnchorEditorChange(event) {
    if(!event.target.closest("[data-anchor-field]"))return;
    handleAnchorEditorInput(event);
    if(state.fieldSnapshot)pushHistory(state.fieldSnapshot);
    state.fieldSnapshot=null;
    syncSimulationTemplates(false);refreshWorkspace();
  }

  function handleCanvasAnchorBar(event) {
    if(event.target.id==="canvasAnchorSelect"){
      state.activeAnchorId=event.target.value;renderGraph();renderAnchors();return;
    }
    if(event.target.closest("[data-open-centers]")){state.editorPane="anchors";renderEditorPane();renderAnchors();$("#anchorEditorPane")?.scrollTo({top:0,behavior:"smooth"});}
    if(event.target.closest("[data-stop-center-assignment]")){state.assignCenter=null;setTool("select");renderAnchors();}
  }
