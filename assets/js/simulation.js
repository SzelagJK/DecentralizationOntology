"use strict";
  function renderMixedFamilyWeights() {
    const host=$("#simFamilyWeights");
    if(!host)return;
    host.innerHTML=MIXED_TYPES.map(type=>`<label class="family-weight-row" title="Relative selection weight for ${esc(topologyName(type))}"><input type="checkbox" data-mixed-enabled="${esc(type)}" ${type==="complete"?"":"checked"}><span>${esc(topologyName(type))}</span><input type="number" data-mixed-weight="${esc(type)}" min="0.1" max="100" step="0.1" value="1" aria-label="${esc(topologyName(type))} weight"></label>`).join("");
  }

  function readMixedWeights() {
    return MIXED_TYPES.map(type=>({
      type,
      enabled:$(`[data-mixed-enabled="${type}"]`)?.checked!==false,
      weight:Number($(`[data-mixed-weight="${type}"]`)?.value||1)
    }));
  }

  function renderPresetDescription() {
    const key=$("#simPreset")?.value||state.simulation.preset;
    state.simulation.preset=key;
    if($("#presetDescription"))$("#presetDescription").textContent=PRESET_DESCRIPTIONS[key]||PRESET_DESCRIPTIONS["fully-random"];
  }

  function randomSeedToken() {
    const values=new Uint32Array(2);
    if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(values);
    else {values[0]=Date.now()>>>0;values[1]=Math.floor(Math.random()*0xffffffff)>>>0;}
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  }

  function choose(rng,values){return values[randomInt(rng,0,values.length-1)];}
  function randomBetween(rng,min,max,digits=0){const value=min+rng()*(max-min),scale=10**digits;return Math.round(value*scale)/scale;}
  function setSimulationField(id,value){const element=$(id);if(!element)return;if(element.type==="checkbox")element.checked=Boolean(value);else element.value=String(value);}

  function setMixedFamilyPattern(weights) {
    for(const type of MIXED_TYPES){
      const enabled=$(`[data-mixed-enabled="${type}"]`),weight=$(`[data-mixed-weight="${type}"]`),value=Number(weights[type]||0);
      if(enabled)enabled.checked=value>0;if(weight)weight.value=String(value>0?value:1);
    }
  }

  function themedPresetSpecification(key) {
    return ({
      "federated-learning":{families:{star:5,core:4,community:3,smallworld:2,tree:1},nodes:[20,300,200,5000],count:[80,1200],subjects:[
        ["Data Storage",35,100,1,2,"uniform",0],["Model Training",35,100,1,2,"uniform",0],["Aggregation Authority",1,35,1,4,"high",25]
      ]},
      "permissioned-blockchain":{families:{core:5,community:4,smallworld:3,complete:1},nodes:[7,80,30,1200],count:[100,1800],subjects:[
        ["Consensus Authority",8,65,1,3,"high",15],["Ledger Replication",35,100,1,2,"uniform",0],["Transaction Submission",10,65,1,2,"endpoints",5]
      ]},
      "public-ledger":{families:{ba:5,smallworld:4,regular:3,random:2,geometric:1},nodes:[100,2500,1000,25000],count:[50,900],subjects:[
        ["Consensus Participation",15,80,1,3,"high",3],["Ledger Replication",45,100,1,2,"uniform",0],["Block Propagation",25,95,1,2,"uniform",0],
        ["Peer Discovery",20,85,1,2,"uniform",2],["Transaction Admission",8,55,1,3,"clustered",8],["Protocol Governance",2,30,1,4,"high",22]
      ]},
      "distributed-storage":{families:{regular:5,community:4,random:3,core:2,smallworld:2},nodes:[50,1200,500,15000],count:[80,1300],subjects:[
        ["Data Shards",25,90,1,4,"uniform",0],["Metadata Coordination",4,35,1,3,"high",12],["Repair Authority",5,45,1,3,"clustered",10],
        ["Retrieval Routing",15,75,1,2,"uniform",2],["Access Policy",3,35,1,4,"high",18],["Integrity Audit",10,65,1,3,"twoClusters",6]
      ]},
      "edge-delivery":{families:{geometric:5,core:4,tree:3,community:3,star:1},nodes:[40,800,300,12000],count:[100,1600],subjects:[
        ["Content Replicas",20,85,1,3,"geometric",0],["Routing Control",3,30,1,3,"high",20],["Request Service",30,100,1,2,"endpoints",0],
        ["Cache Placement",8,55,1,3,"clustered",7],["Origin Authority",1,20,1,4,"high",30],["Telemetry Collection",15,70,1,2,"uniform",4]
      ]},
      "multi-region-services":{families:{community:5,core:4,smallworld:4,random:2},nodes:[30,500,200,8000],count:[120,2200],subjects:[
        ["Request Execution",25,90,1,3,"uniform",0],["State Storage",15,70,1,4,"clustered",5],["Service Discovery",5,40,1,3,"high",15],
        ["Deployment Authority",3,32,1,4,"high",20],["Failover Control",5,42,1,3,"twoClusters",15],["Key Management",2,28,1,4,"clustered",24]
      ]},
      "iot-edge":{families:{geometric:5,tree:4,star:3,community:3,core:1},nodes:[100,2500,1000,30000],count:[50,900],subjects:[
        ["Sensing",40,100,1,2,"endpoints",0],["Actuation Authority",2,25,1,3,"clustered",25],["Control Aggregation",3,35,1,4,"high",20],
        ["Device Enrollment",4,40,1,3,"clustered",14],["Firmware Distribution",10,70,1,3,"uniform",6],["Event Routing",15,80,1,2,"geometric",3]
      ]},
      "decentralized-identity":{families:{community:5,ba:4,core:3,smallworld:3,random:1},nodes:[50,1000,400,15000],count:[80,1400],subjects:[
        ["Identifier Registry",30,100,1,3,"uniform",0],["Credential Issuance",5,45,1,4,"clustered",12],["Verification",25,100,1,2,"uniform",0],
        ["Revocation Publication",8,60,1,3,"uniform",7],["Wallet Recovery",2,30,1,4,"clustered",24],["Trust Governance",2,28,1,4,"high",22]
      ]}
    })[key];
  }

  function makePresetTemplate(spec,index,rng) {
    const [name,covLow,covHigh,multLow,multHigh,placementHint,centralMax]=spec;
    const split=covLow+(covHigh-covLow)*randomBetween(rng,.25,.55,2),coverageMin=randomBetween(rng,covLow,split,1),coverageMax=randomBetween(rng,Math.max(coverageMin,split),covHigh,1);
    const placements=placementHint==="geometric"?["clustered","twoClusters","uniform"]:[placementHint,"uniform",placementHint==="high"?"articulation":"nonarticulation"];
    const anchorId=inferAnchorType(name);
    return {id:`preset-${index+1}-${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,name,anchorId,anchor:ANCHOR_CATALOG[anchorId]?.label||"Authority",anchorMode:"infer",color:SUBJECT_COLORS[index%SUBJECT_COLORS.length],epsilon:randomBetween(rng,.75,1.4,2),coverageMin,coverageMax,coverageDistribution:choose(rng,["uniform","triangular","normal"]),multiplicityMin:multLow,multiplicityMax:randomInt(rng,multLow,multHigh),multiplicityDistribution:choose(rng,["uniform","fixed","poisson"]),placement:choose(rng,placements),relation:index?choose(rng,["independent","overlap","avoid"]):"independent",relationStrength:index?randomInt(rng,25,80):0,epsilonJitter:randomInt(rng,0,25)};
  }

  function inferAnchorType(name) {
    const text=String(name||"").toLowerCase();
    if(/govern|council|foundation|committee|policy/.test(text))return "governance";
    if(/trust|certificate|credential|key|identity|validator/.test(text))return "trust";
    if(/data|ledger|shard|replica|state|content|cache|storage|registry|wallet/.test(text))return "ownership";
    return "authority";
  }

  function defaultSimulationAnchor(type,index=0) {
    const definition=ANCHOR_CATALOG[type]||ANCHOR_CATALOG.custom;
    const defaults={
      ownership:{model:"few-actors",minActors:2,maxActors:6,overlapChance:3,dominantShare:45},
      authority:{model:"realistic-mixture",minActors:1,maxActors:4,overlapChance:12,dominantShare:65},
      trust:{model:"overlapping-consortium",minActors:2,maxActors:6,overlapChance:25,dominantShare:45},
      governance:{model:"realistic-mixture",minActors:1,maxActors:5,overlapChance:20,dominantShare:55},
      custom:{model:"realistic-mixture",minActors:1,maxActors:5,overlapChance:15,dominantShare:50}
    }[type]||{};
    return {id:type,name:definition.label,type,color:SUBJECT_COLORS[index%SUBJECT_COLORS.length],enabled:true,weight:1,...defaults};
  }

  function syncSimulationAnchorTemplates(force=false) {
    const existing=new Map((state.simulation.anchorTemplates||[]).map(item=>[item.id,item]));
    if(!force&&existing.size){renderSimulationAnchorTemplates();return;}
    const source=state.anchors.length?state.anchors:[{id:"authority",name:"Authority",type:"authority",color:SUBJECT_COLORS[1]}];
    state.simulation.anchorTemplates=source.map((anchor,index)=>{
      const saved=existing.get(anchor.id);
      return saved&&!force?{...saved,name:anchor.name,type:anchor.type,color:anchor.color}:{...defaultSimulationAnchor(anchor.type,index),id:anchor.id,name:anchor.name,color:anchor.color};
    });
    renderSimulationAnchorTemplates();
  }

  function renderSimulationAnchorTemplates() {
    const host=$("#simAnchorList");if(!host)return;
    if(!state.simulation.anchorTemplates.length){host.innerHTML='<div class="empty-template">No anchor interpretations are available. Sync the canvas or randomize anchors.</div>';return;}
    host.innerHTML=state.simulation.anchorTemplates.map(item=>`<section class="sim-anchor-card" style="--anchor-color:${esc(item.color)}"><div class="sim-anchor-head"><strong>${esc(item.name)}</strong><span>${esc(ANCHOR_CATALOG[item.type]?.description||ANCHOR_CATALOG.custom.description)}</span></div><div class="sim-anchor-grid">
      <label class="check-label"><input data-sim-anchor-field="enabled" data-sim-anchor-id="${esc(item.id)}" type="checkbox" ${item.enabled?"checked":""}><span>Available to subjects</span></label>
      <label>Selection weight<input data-sim-anchor-field="weight" data-sim-anchor-id="${esc(item.id)}" type="number" min="0.1" max="100" step="0.1" value="${esc(item.weight)}"></label>
      <label>Center-family model<select data-sim-anchor-field="model" data-sim-anchor-id="${esc(item.id)}"><option value="realistic-mixture" ${item.model==="realistic-mixture"?"selected":""}>Realistic mixture</option><option value="singleton" ${item.model==="singleton"?"selected":""}>Independent actors (singleton)</option><option value="single-operator" ${item.model==="single-operator"?"selected":""}>One operator / authority</option><option value="few-actors" ${item.model==="few-actors"?"selected":""}>Few organizational actors</option><option value="hub-led" ${item.model==="hub-led"?"selected":""}>Hub-led control domains</option><option value="topological" ${item.model==="topological"?"selected":""}>Connected operating domains</option><option value="overlapping-consortium" ${item.model==="overlapping-consortium"?"selected":""}>Overlapping consortium</option></select></label>
      <label>Actor / domain count<input data-sim-anchor-field="minActors" data-sim-anchor-id="${esc(item.id)}" type="number" min="1" max="100" step="1" value="${esc(item.minActors)}" aria-label="Minimum actor count"><span class="field-to">to</span><input data-sim-anchor-field="maxActors" data-sim-anchor-id="${esc(item.id)}" type="number" min="1" max="100" step="1" value="${esc(item.maxActors)}" aria-label="Maximum actor count"></label>
      <label>Cross-domain overlap chance %<input data-sim-anchor-field="overlapChance" data-sim-anchor-id="${esc(item.id)}" type="number" min="0" max="100" step="1" value="${esc(item.overlapChance)}"></label>
      <label>Dominant actor target share %<input data-sim-anchor-field="dominantShare" data-sim-anchor-id="${esc(item.id)}" type="number" min="1" max="100" step="1" value="${esc(item.dominantShare)}"></label>
    </div><p class="sim-anchor-summary">One system-level family is generated and reused by every simulated subject that resolves to this anchor. Overlap is permitted; uncovered vertices receive singleton completion.</p></section>`).join("");
  }

  function randomizeSimulationAnchors() {
    const rng=mulberry32(hashSeed(`${$("#simSeed")?.value||"ontology"}:anchors:${randomSeedToken()}`));
    const types=shuffleInPlace(["ownership","authority","trust","governance"],rng).slice(0,randomInt(rng,2,4));
    if(!types.includes("authority")&&rng()<.7)types[0]="authority";
    state.simulation.anchorTemplates=[...new Set(types)].map((type,index)=>{
      const item=defaultSimulationAnchor(type,index),models=REALISTIC_CENTER_MODELS[type]||REALISTIC_CENTER_MODELS.custom;
      item.model=choose(rng,["realistic-mixture",...models]);
      item.minActors=randomInt(rng,1,type==="ownership"?3:2);item.maxActors=randomInt(rng,Math.max(2,item.minActors),type==="trust"?9:7);
      item.overlapChance=type==="trust"?randomInt(rng,15,45):type==="governance"?randomInt(rng,10,35):randomInt(rng,0,22);
      item.dominantShare=randomInt(rng,35,85);item.weight=randomInt(rng,1,5);return item;
    });
    for(const template of state.simulation.templates){template.anchorMode=choose(rng,["infer","infer","random","fixed"]);const compatible=state.simulation.anchorTemplates.find(anchor=>anchor.type===inferAnchorType(template.name))||choose(rng,state.simulation.anchorTemplates);template.anchorId=compatible.id;template.anchor=compatible.name;}
    renderSimulationAnchorTemplates();renderSimulationTemplates();updateSimulationEstimate();
    toast("Randomized contextual anchor availability, subject assignment strategies, and realistic center-family models.");
  }

  function handleSimulationAnchorInput(event) {
    const target=event.target.closest("[data-sim-anchor-field][data-sim-anchor-id]");if(!target)return;
    const item=state.simulation.anchorTemplates.find(anchor=>anchor.id===target.dataset.simAnchorId);if(!item)return;
    const field=target.dataset.simAnchorField;item[field]=target.type==="checkbox"?target.checked:target.tagName==="SELECT"?target.value:Number(target.value);
    renderSimulationTemplates();updateSimulationEstimate();
  }

  function fitRandomizedPresetToBudgets() {
    const maxN=Math.max(2,Number($("#simNodesMax").value)),topology=$("#simTopology").value,enabled=topology==="mixed"?readMixedWeights().filter(item=>item.enabled&&item.weight>0).map(item=>item.type):[topology],addition=1+Number($("#simEdgeAddition").value||0)/100,targetEdges=8000000/addition;
    if(enabled.includes("geometric")){
      const cap=Math.max(.005,Math.sqrt((2*targetEdges)/(Math.PI*maxN*Math.max(1,maxN-1))));
      setSimulationField("#simRadius",Math.min(Number($("#simRadius").value),cap).toFixed(4));
    }
    if(enabled.includes("core")){
      const cap=Math.max(.01,Math.sqrt(2*targetEdges)/maxN);
      setSimulationField("#simCoreFraction",Math.min(Number($("#simCoreFraction").value),cap).toFixed(4));
    }
    if(enabled.includes("lollipop")){
      const cap=Math.max(1,Math.sqrt(2*targetEdges)/maxN*100);
      setSimulationField("#simLollipopFraction",Math.min(Number($("#simLollipopFraction").value),cap).toFixed(2));
    }
    const config=readSimulationConfig(),avgN=(config.nodesMin+config.nodesMax)/2,perSystem=(config.topology==="mixed"?estimateMixedEdges(avgN,config):estimateEdgesPerSystem(config.topology,avgN,config))*(1-config.edgeDropout/100)*(1+config.edgeAddition/100),countCap=Math.max(1,Math.floor(Math.min(MAX_BATCH_SYSTEMS,MAX_NODE_WORK/Math.max(1,avgN),MAX_EDGE_WORK/Math.max(1,perSystem))));
    setSimulationField("#simCount",Math.min(config.count,countCap));
  }

  function applySimulationPreset() {
    const key=$("#simPreset").value,token=randomSeedToken(),rng=mulberry32(hashSeed(`${key}:${token}`));
    state.simulation.preset=key;setSimulationField("#simSeed",`${key}-${token}`);
    setSimulationField("#simSweep",false);setSimulationField("#simSweepFrom",.05);setSimulationField("#simSweepTo",.5);$("#simSweepFrom").disabled=true;$("#simSweepTo").disabled=true;
    setSimulationField("#simMeanDegree",randomInt(rng,3,14));setSimulationField("#simRegularDegree",randomInt(rng,2,10));setSimulationField("#simAttachment",randomInt(rng,1,5));setSimulationField("#simNeighbourhood",randomInt(rng,2,12)*2);
    setSimulationField("#simBeta",randomBetween(rng,.03,.45,2));setSimulationField("#simRadius",randomBetween(rng,.02,.24,3));setSimulationField("#simBranching",randomInt(rng,2,7));setSimulationField("#simCoreFraction",randomBetween(rng,.05,.3,2));setSimulationField("#simPeripheryLinks",randomInt(rng,1,5));
    setSimulationField("#simCommunities",randomInt(rng,2,12));setSimulationField("#simCommunityIn",randomInt(rng,60,95));setSimulationField("#simBipartiteFraction",randomInt(rng,25,75));setSimulationField("#simLollipopFraction",randomInt(rng,8,35));setSimulationField("#simParameterJitter",randomInt(rng,5,35));setSimulationField("#simEdgeDropout",randomBetween(rng,0,12,1));setSimulationField("#simEdgeAddition",randomInt(rng,0,30));
    if(key==="fully-random"){
      const useMixed=rng()<.65,type=useMixed?"mixed":choose(rng,MIXED_TYPES.filter(item=>item!=="complete"));setSimulationField("#simTopology",type);
      const weights={};for(const family of MIXED_TYPES)if(family!=="complete"&&rng()<.48)weights[family]=randomInt(rng,1,8);if(!Object.keys(weights).length)weights.random=1;setMixedFamilyPattern(weights);
      const min=Math.max(2,Math.round(Math.exp(randomBetween(rng,Math.log(5),Math.log(5000),4)))),max=Math.min(MAX_SYSTEM_VERTICES,Math.max(min,Math.round(min*randomBetween(rng,1.2,30,2))));
      const average=(min+max)/2,maxCount=Math.max(1,Math.floor(MAX_NODE_WORK/Math.max(1,average)));setSimulationField("#simNodesMin",min);setSimulationField("#simNodesMax",max);setSimulationField("#simCount",Math.min(maxCount,randomInt(rng,25,Math.min(MAX_BATCH_SYSTEMS,8000))));setSimulationField("#simNodeDistribution",choose(rng,["uniform","triangular","normal","loguniform"]));setSimulationField("#simEnsureConnected",rng()<.55);setSimulationField("#simConnectedChance",randomInt(rng,0,100));
      const count=randomInt(rng,4,8);state.simulation.templates=Array.from({length:count},(_,index)=>makePresetTemplate([`Subject u${index+1}`,1,100,1,Math.min(8,randomInt(rng,2,8)),choose(rng,["uniform","high","low","clustered","twoClusters","articulation","nonarticulation","endpoints"]),45],index,rng));
    }else{
      const spec=themedPresetSpecification(key);setSimulationField("#simTopology","mixed");setMixedFamilyPattern(spec.families);const min=randomInt(rng,spec.nodes[0],spec.nodes[1]),max=randomInt(rng,Math.max(min,spec.nodes[2]),spec.nodes[3]),average=(min+max)/2,maxCount=Math.max(1,Math.floor(MAX_NODE_WORK/Math.max(1,average)));
      setSimulationField("#simNodesMin",min);setSimulationField("#simNodesMax",max);setSimulationField("#simCount",Math.min(maxCount,randomInt(rng,spec.count[0],spec.count[1])));setSimulationField("#simNodeDistribution",choose(rng,["uniform","triangular","normal","loguniform"]));setSimulationField("#simEnsureConnected",rng()<.8);setSimulationField("#simConnectedChance",randomInt(rng,35,100));state.simulation.templates=spec.subjects.map((item,index)=>makePresetTemplate(item,index,rng));
    }
    const inferred=[...new Set(state.simulation.templates.map(item=>inferAnchorType(item.name)))];
    const available=key==="fully-random"?shuffleInPlace(["ownership","authority","trust","governance"],rng).slice(0,randomInt(rng,2,4)):inferred;
    state.simulation.anchorTemplates=available.map((type,index)=>{
      const item=defaultSimulationAnchor(type,index),models=REALISTIC_CENTER_MODELS[type]||REALISTIC_CENTER_MODELS.custom;
      item.model=choose(rng,["realistic-mixture",...models]);item.maxActors=randomInt(rng,Math.max(2,item.minActors),type==="trust"?9:7);item.overlapChance=type==="trust"?randomInt(rng,15,45):randomInt(rng,0,30);item.dominantShare=randomInt(rng,35,85);item.weight=randomInt(rng,1,5);return item;
    });
    for(const template of state.simulation.templates){const resolved=state.simulation.anchorTemplates.find(anchor=>anchor.type===inferAnchorType(template.name))||state.simulation.anchorTemplates[0];template.anchorId=resolved.id;template.anchor=resolved.name;template.anchorMode=key==="fully-random"?choose(rng,["infer","random","fixed"]):"infer";}
    fitRandomizedPresetToBudgets();$("#mixedFamilyDetails").open=false;renderSimulationAnchorTemplates();renderSimulationTemplates();renderPresetDescription();updateSimulationEstimate();toast(`Randomized ${$("#simPreset").selectedOptions[0].textContent} preset, including anchors and center families.`);
  }

  function syncSimulationTemplates(force = false) {
    syncSimulationAnchorTemplates(force);
    const existing = new Map(state.simulation.templates.map(item => [item.id,item]));
    if(!force&&existing.size){
      for(const item of state.subjects){const saved=existing.get(item.id);if(saved){saved.name=item.name;saved.anchorId=item.anchorId;saved.anchor=subjectAnchorName(item);saved.color=item.color;saved.epsilon=Number(item.epsilon);}}
      renderSimulationTemplates();return;
    }
    state.simulation.templates = state.subjects.map(item => {
      if (!force && existing.has(item.id)) {
        const saved = existing.get(item.id);
        return {
          ...saved,name:item.name,anchorId:item.anchorId,anchor:subjectAnchorName(item),anchorMode:saved.anchorMode||"fixed",color:item.color,epsilon:Number(item.epsilon),
          coverageDistribution:saved.coverageDistribution||"uniform",
          multiplicityDistribution:saved.multiplicityDistribution||"uniform",
          relation:saved.relation||"independent",relationStrength:Number(saved.relationStrength??60),
          epsilonJitter:Number(saved.epsilonJitter??0)
        };
      }
      const coverage = state.graph.nodes.length ? Object.keys(item.realizations).length / state.graph.nodes.length * 100 : 25;
      const perSupport = Object.keys(item.realizations).length ? Number(item.delta) / Object.keys(item.realizations).length : 1;
      return {
        id:item.id,name:item.name,anchorId:item.anchorId,anchor:subjectAnchorName(item),anchorMode:"fixed",color:item.color,epsilon:Number(item.epsilon),
        coverageMin:clamp(Math.round(coverage*.75),.1,100),coverageMax:clamp(Math.round(coverage*1.25),.1,100),
        multiplicityMin:Math.max(1,Math.floor(perSupport)),multiplicityMax:Math.max(1,Math.ceil(perSupport)),
        coverageDistribution:"uniform",multiplicityDistribution:"uniform",
        placement:"uniform",relation:"independent",relationStrength:60,
        epsilonJitter:0
      };
    });
    renderSimulationTemplates();
  }

  function renderSimulationTemplates() {
    const host=$("#simSubjectList");
    if (!state.simulation.templates.length) {
      host.innerHTML='<div class="empty-template">Add subject–anchor pairs in the workspace, then sync them here.</div>';
      return;
    }
    host.innerHTML=state.simulation.templates.map((item,index)=>{
      const anchorOptions=state.simulation.anchorTemplates.map(anchor=>`<option value="${esc(anchor.id)}" ${item.anchorId===anchor.id?"selected":""} ${anchor.enabled?"":"disabled"}>${esc(anchor.name)}${anchor.enabled?"":" (disabled)"}</option>`).join("");
      const pairAnchor=item.anchorMode==="random"?"random enabled anchor":item.anchorMode==="infer"?`inferred ${ANCHOR_CATALOG[inferAnchorType(item.name)]?.label||"anchor"}`:state.simulation.anchorTemplates.find(anchor=>anchor.id===item.anchorId)?.name||item.anchor;
      return `<details class="sim-template" style="--subject-color:${esc(item.color)}" data-template="${esc(item.id)}"><summary class="sim-template-head"><strong>${esc(profileEntryLabel(item.name,pairAnchor))}</strong><span>base ε=${fmt(item.epsilon,2)} · expand controls</span></summary><div class="template-grid">
      <label>Anchor strategy<select data-sim-field="anchorMode" data-template-id="${esc(item.id)}"><option value="fixed" ${item.anchorMode==="fixed"?"selected":""}>Fixed interpretation</option><option value="infer" ${item.anchorMode==="infer"?"selected":""}>Infer from subject semantics</option><option value="random" ${item.anchorMode==="random"?"selected":""}>Random enabled anchor</option></select></label>
      <label>Fixed / fallback anchor<select data-sim-field="anchorId" data-template-id="${esc(item.id)}" ${item.anchorMode==="random"?"disabled":""}>${anchorOptions}</select></label>
      <label>Support ratio λ(pᵤ)/|Gₜ| min %<input data-sim-field="coverageMin" data-template-id="${esc(item.id)}" type="number" min="0.01" max="100" step="0.1" value="${esc(item.coverageMin)}"></label>
      <label>Support ratio λ(pᵤ)/|Gₜ| max %<input data-sim-field="coverageMax" data-template-id="${esc(item.id)}" type="number" min="0.01" max="100" step="0.1" value="${esc(item.coverageMax)}"></label>
      <label>Support-ratio distribution<select data-sim-field="coverageDistribution" data-template-id="${esc(item.id)}"><option value="uniform" ${item.coverageDistribution==="uniform"?"selected":""}>Uniform</option><option value="fixed" ${item.coverageDistribution==="fixed"?"selected":""}>Fixed midpoint</option><option value="triangular" ${item.coverageDistribution==="triangular"?"selected":""}>Triangular</option><option value="normal" ${item.coverageDistribution==="normal"?"selected":""}>Truncated normal</option><option value="ushaped" ${item.coverageDistribution==="ushaped"?"selected":""}>U-shaped extremes</option></select></label>
      <label>Realizations per supporting vertex — min<input data-sim-field="multiplicityMin" data-template-id="${esc(item.id)}" type="number" min="1" max="50" step="1" value="${esc(item.multiplicityMin)}"></label>
      <label>Realizations per supporting vertex — max<input data-sim-field="multiplicityMax" data-template-id="${esc(item.id)}" type="number" min="1" max="50" step="1" value="${esc(item.multiplicityMax)}"></label>
      <label>Multiplicity δ(pᵤ) distribution<select data-sim-field="multiplicityDistribution" data-template-id="${esc(item.id)}"><option value="uniform" ${item.multiplicityDistribution==="uniform"?"selected":""}>Discrete uniform</option><option value="fixed" ${item.multiplicityDistribution==="fixed"?"selected":""}>Fixed midpoint</option><option value="poisson" ${item.multiplicityDistribution==="poisson"?"selected":""}>Truncated Poisson</option><option value="geometric" ${item.multiplicityDistribution==="geometric"?"selected":""}>Truncated geometric</option></select></label>
      <label>Placement<select data-sim-field="placement" data-template-id="${esc(item.id)}"><option value="uniform" ${item.placement==="uniform"?"selected":""}>Uniform</option><option value="high" ${item.placement==="high"?"selected":""}>High-degree first</option><option value="low" ${item.placement==="low"?"selected":""}>Low-degree first</option><option value="clustered" ${item.placement==="clustered"?"selected":""}>One connected cluster</option><option value="twoClusters" ${item.placement==="twoClusters"?"selected":""}>Two clusters</option><option value="articulation" ${item.placement==="articulation"?"selected":""}>Articulation-first</option><option value="nonarticulation" ${item.placement==="nonarticulation"?"selected":""}>Avoid articulations</option><option value="endpoints" ${item.placement==="endpoints"?"selected":""}>Endpoints / periphery</option></select></label>
      <label>Relation to prior subject<select data-sim-field="relation" data-template-id="${esc(item.id)}" ${index===0?"disabled":""}><option value="independent" ${item.relation==="independent"?"selected":""}>Independent</option><option value="overlap" ${item.relation==="overlap"?"selected":""}>Prefer overlap</option><option value="avoid" ${item.relation==="avoid"?"selected":""}>Prefer separation</option><option value="nested" ${item.relation==="nested"?"selected":""}>Nested in prior support</option></select></label>
      <label>Relation strength %<input data-sim-field="relationStrength" data-template-id="${esc(item.id)}" type="number" min="0" max="100" step="1" value="${esc(item.relationStrength)}" ${index===0?"disabled":""}></label>
      <label>Subject weight ε jitter ± %<input data-sim-field="epsilonJitter" data-template-id="${esc(item.id)}" type="number" min="0" max="100" step="1" value="${esc(item.epsilonJitter)}"></label>
    </div></details>`;}).join("");
  }

  function handleSimulationTemplateInput(event) {
    const target=event.target.closest("[data-sim-field][data-template-id]");
    if(!target)return;
    const item=state.simulation.templates.find(template=>template.id===target.dataset.templateId);
    if(!item)return;
    const field=target.dataset.simField;
    item[field]=target.tagName==="SELECT"||target.type==="text"?target.value:Number(target.value);
    if(field==="anchorId"){const anchor=state.simulation.anchorTemplates.find(candidate=>candidate.id===item.anchorId);if(anchor)item.anchor=anchor.name;}
    if((field==="anchorMode"||field==="anchorId")&&event.type==="change")renderSimulationTemplates();
    updateSimulationEstimate();
  }

  function readSimulationConfig() {
    const number=id=>Number($(id).value);
    return {
      topology:$("#simTopology").value,
      preset:state.simulation.preset,
      seed:$("#simSeed").value || "ontology-2026",
      nodesMin:number("#simNodesMin"),nodesMax:number("#simNodesMax"),count:number("#simCount"),
      nodeDistribution:$("#simNodeDistribution").value,mixedWeights:readMixedWeights(),
      ensureConnected:$("#simEnsureConnected").checked,connectedChance:number("#simConnectedChance"),
      meanDegree:number("#simMeanDegree"),attachment:number("#simAttachment"),neighbourhood:number("#simNeighbourhood"),
      beta:number("#simBeta"),radius:number("#simRadius"),branching:number("#simBranching"),
      regularDegree:number("#simRegularDegree"),coreFraction:number("#simCoreFraction"),peripheryLinks:number("#simPeripheryLinks"),
      communities:number("#simCommunities"),communityIn:number("#simCommunityIn"),bipartiteFraction:number("#simBipartiteFraction"),lollipopFraction:number("#simLollipopFraction"),
      parameterJitter:number("#simParameterJitter"),edgeDropout:number("#simEdgeDropout"),edgeAddition:number("#simEdgeAddition"),
      sweep:$("#simSweep").checked,sweepFrom:number("#simSweepFrom"),sweepTo:number("#simSweepTo"),
      templates:clone(state.simulation.templates),anchorTemplates:clone(state.simulation.anchorTemplates)
    };
  }

  function estimateEdgesPerSystem(type,n,config) {
    if(type==="path"||type==="star"||type==="tree")return Math.max(0,n-1);
    if(type==="ring")return n;
    if(type==="wheel")return n<4?n*(n-1)/2:2*(n-1);
    if(type==="mesh")return Math.max(0,2*n-2*Math.sqrt(n));
    if(type==="complete")return n*(n-1)/2;
    if(type==="random")return n*config.meanDegree/2;
    if(type==="regular")return n*Math.min(n-1,config.regularDegree)/2;
    if(type==="ba")return n*Math.max(1,config.attachment);
    if(type==="smallworld")return n*Math.max(2,config.neighbourhood)/2;
    if(type==="geometric")return n*(n-1)*Math.min(1,Math.PI*config.radius*config.radius)/2;
    if(type==="community"||type==="bipartite")return n*config.meanDegree/2;
    if(type==="core") { const c=Math.max(2,n*config.coreFraction); return c*(c-1)/2+(n-c)*config.peripheryLinks; }
    if(type==="lollipop") { const c=Math.min(n-1,Math.max(2,Math.round(n*config.lollipopFraction/100))); return c*(c-1)/2+Math.max(0,n-c); }
    return n*config.meanDegree/2;
  }

  function estimateMixedEdges(n,config) {
    const enabled=config.mixedWeights.filter(item=>item.enabled&&item.weight>0);
    const total=enabled.reduce((sum,item)=>sum+item.weight,0);
    if(!total)return 0;
    return enabled.reduce((sum,item)=>sum+estimateEdgesPerSystem(item.type,n,config)*item.weight,0)/total;
  }

  function validateSimulationConfig(config) {
    const errors=[],warnings=[];
    if(!Number.isInteger(config.nodesMin)||!Number.isInteger(config.nodesMax)||config.nodesMin<2||config.nodesMax>MAX_SYSTEM_VERTICES||config.nodesMin>config.nodesMax)errors.push(`Vertex bounds must be integers between 2 and ${MAX_SYSTEM_VERTICES.toLocaleString()}, with minimum ≤ maximum.`);
    if(!Number.isInteger(config.count)||config.count<1||config.count>MAX_BATCH_SYSTEMS)errors.push(`Total system models must be an integer from 1 to ${MAX_BATCH_SYSTEMS.toLocaleString()}.`);
    if(!config.templates.length)errors.push("At least one subject template is required.");
    const enabledAnchors=config.anchorTemplates.filter(item=>item.enabled&&Number(item.weight)>0);
    if(!enabledAnchors.length)errors.push("Enable at least one anchor interpretation with a positive selection weight.");
    for(const anchor of config.anchorTemplates){
      if(anchor.enabled&&(!(Number(anchor.weight)>0)||Number(anchor.weight)>100))errors.push(`${anchor.name}: enabled anchor weights must be in (0,100].`);
      if(!Number.isInteger(anchor.minActors)||!Number.isInteger(anchor.maxActors)||anchor.minActors<1||anchor.minActors>anchor.maxActors||anchor.maxActors>100)errors.push(`${anchor.name}: actor/domain count must satisfy 1 ≤ min ≤ max ≤ 100.`);
      if(anchor.overlapChance<0||anchor.overlapChance>100)errors.push(`${anchor.name}: overlap chance must be in [0,100].`);
      if(anchor.dominantShare<1||anchor.dominantShare>100)errors.push(`${anchor.name}: dominant actor share must be in [1,100].`);
    }
    if(config.topology==="mixed"&&!config.mixedWeights.some(item=>item.enabled&&item.weight>0))errors.push("Enable at least one mixed-catalogue topology with a positive weight.");
    if(config.mixedWeights.some(item=>item.enabled&&(!(item.weight>0)||item.weight>100)))errors.push("Enabled mixed-family weights must be in (0,100].");
    if(config.connectedChance<0||config.connectedChance>100)errors.push("Connectivity chance must be in [0,100].");
    if(config.parameterJitter<0||config.parameterJitter>100)errors.push("Parameter jitter must be in [0,100].");
    if(config.edgeDropout<0||config.edgeDropout>95)errors.push("Edge dropout must be in [0,95].");
    if(config.edgeAddition<0||config.edgeAddition>500)errors.push("Extra random edges must be in [0,500].");
    if(!Number.isInteger(config.communities)||config.communities<2||config.communities>100)errors.push("Community count must be an integer from 2 to 100.");
    if(config.communityIn<0||config.communityIn>100)errors.push("Within-community link share must be in [0,100].");
    if(config.bipartiteFraction<5||config.bipartiteFraction>95)errors.push("Bipartite left-side share must be in [5,95].");
    if(config.lollipopFraction<1||config.lollipopFraction>90)errors.push("Lollipop clique share must be in [1,90].");
    for(const item of config.templates){
      if(!(item.coverageMin>0&&item.coverageMin<=item.coverageMax&&item.coverageMax<=100))errors.push(`${item.name}: coverage must satisfy 0 < min ≤ max ≤ 100.`);
      if(!Number.isInteger(item.multiplicityMin)||!Number.isInteger(item.multiplicityMax)||item.multiplicityMin<1||item.multiplicityMin>item.multiplicityMax||item.multiplicityMax>50)errors.push(`${item.name}: realization multiplicity must satisfy 1 ≤ min ≤ max ≤ 50.`);
      if(item.anchorMode==="fixed"&&!enabledAnchors.some(anchor=>anchor.id===item.anchorId))errors.push(`${item.name}: its fixed anchor must be enabled.`);
      if(item.relationStrength<0||item.relationStrength>100)errors.push(`${item.name}: relation strength must be in [0,100].`);
      if(item.epsilonJitter<0||item.epsilonJitter>100)errors.push(`${item.name}: epsilon jitter must be in [0,100].`);
    }
    const avgN=(config.nodesMin+config.nodesMax)/2;
    const nodesWork=avgN*config.count;
    const baseEdges=config.topology==="mixed"?estimateMixedEdges(avgN,config):estimateEdgesPerSystem(config.topology,avgN,config);
    const edgeWork=baseEdges*(1-config.edgeDropout/100)*(1+config.edgeAddition/100)*config.count;
    const candidateTypes=config.topology==="mixed"?config.mixedWeights.filter(item=>item.enabled&&item.weight>0).map(item=>item.type):[config.topology],maxSystemEdges=Math.max(0,...candidateTypes.map(type=>estimateEdgesPerSystem(type,config.nodesMax,config)))*(1-config.edgeDropout/100)*(1+config.edgeAddition/100);
    if(nodesWork>MAX_NODE_WORK)errors.push(`The batch would process about ${Math.round(nodesWork).toLocaleString()} vertex instances; reduce the range or model count below the ${MAX_NODE_WORK.toLocaleString()} workload budget.`);
    if(edgeWork>MAX_EDGE_WORK)errors.push(`The batch is estimated at ${Math.round(edgeWork).toLocaleString()} edge instances; reduce density or model count below the ${MAX_EDGE_WORK.toLocaleString()} workload budget.`);
    if(maxSystemEdges>MAX_EDGES_PER_SYSTEM)errors.push(`At the maximum order, an enabled family could exceed ${MAX_EDGES_PER_SYSTEM.toLocaleString()} edges in one model; reduce order, density, or perturbation.`);
    if(candidateTypes.includes("complete")&&config.nodesMax>5000)errors.push("Complete-graph generation is capped at 5,000 vertices because |E| grows quadratically.");
    if(config.topology==="mixed"&&config.sweep)warnings.push("Parameter sweep is ignored for a mixed topology batch.");
    if(config.nodesMax>EXACT_PREVIEW_LIMIT)warnings.push(`Models above ${EXACT_PREVIEW_LIMIT.toLocaleString()} vertices are evaluated over the complete Gₜ but use a simplified result preview.`);
    if(config.count>SYSTEM_SELECTOR_LIMIT)warnings.push("Large batches abbreviate system selectors; every model remains accessible through the paginated result table.");
    return {valid:!errors.length,errors:[...new Set(errors)],warnings};
  }

  function updateSimulationEstimate() {
    if(!$("#simCount"))return;
    const config=readSimulationConfig();
    const validation=validateSimulationConfig(config);
    const avgN=(config.nodesMin+config.nodesMax)/2;
    const baseEdges=config.topology==="mixed"?estimateMixedEdges(avgN,config):estimateEdgesPerSystem(config.topology,avgN,config);
    const edges=Math.round(baseEdges*(1-config.edgeDropout/100)*(1+config.edgeAddition/100)*config.count);
    $("#simEstimate").textContent=`≈ ${Math.round(avgN*config.count).toLocaleString()} vertex instances · ≈ ${edges.toLocaleString()} edge instances · ${config.templates.length} profile entr${config.templates.length===1?"y":"ies"}`;
    const issues=$("#simIssues");
    const messages=[...validation.errors,...validation.warnings];
    issues.classList.toggle("hidden",!messages.length);
    issues.innerHTML=messages.map(text=>`<div>${validation.errors.includes(text)?"⚠":"i"} ${esc(text)}</div>`).join("");
    $("#runSimulationBtn").disabled=!validation.valid||state.simulation.running;
    drawSimulationDistributionPreview(config);
  }

  function drawSimulationDistributionPreview(config) {
    const canvas=$("#simulationDistributionPreview"),explanation=$("#simulationDistributionExplanation");
    if(!canvas||!explanation)return;
    const rect=canvas.getBoundingClientRect(),w=Math.max(650,rect.width||1000),h=240,dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.font="11px Inter, sans-serif";ctx.textBaseline="middle";
    state.simulation.previewPoints=[];
    const rng=mulberry32(hashSeed(`${config.seed}:distribution-preview`)),samples=1200,bins=18,counts=new Array(bins).fill(0),familyCounts=new Map();
    for(let i=0;i<samples;i++){
      const n=sampleIntegerRange(rng,config.nodesMin,config.nodesMax,config.nodeDistribution||"uniform"),ratio=config.nodesMax>config.nodesMin?(n-config.nodesMin)/(config.nodesMax-config.nodesMin):.5,index=clamp(Math.floor(ratio*bins),0,bins-1);counts[index]++;
      const type=config.topology==="mixed"?weightedTopology(config.mixedWeights,rng):config.topology;familyCounts.set(type,(familyCounts.get(type)||0)+1);
    }
    const split=Math.max(390,w*.58),left={x:48,y:37,w:split-72,h:158},peak=Math.max(1,...counts),bw=left.w/bins;
    ctx.fillStyle="#344049";ctx.font="700 12px Inter, sans-serif";ctx.textAlign="left";ctx.fillText("Vertex-count probability",left.x,19);
    ctx.strokeStyle="#dfe4e7";for(let i=0;i<=4;i++){const y=left.y+left.h*(1-i/4);ctx.beginPath();ctx.moveTo(left.x,y);ctx.lineTo(left.x+left.w,y);ctx.stroke();}
    counts.forEach((count,i)=>{const bh=count/peak*left.h,x=left.x+i*bw+1,y=left.y+left.h-bh,width=Math.max(1,bw-2);ctx.fillStyle="#2878b5";ctx.fillRect(x,y,width,bh);const binMin=Math.round(config.nodesMin+i/bins*(config.nodesMax-config.nodesMin)),binMax=Math.round(config.nodesMin+(i+1)/bins*(config.nodesMax-config.nodesMin));state.simulation.previewPoints.push({x,y,w:width,h:bh,label:`${binMin.toLocaleString()}–${binMax.toLocaleString()} vertices`,detail:`${fmt(count/samples*100,1)}% of preview draws (${count.toLocaleString()} / ${samples.toLocaleString()})`});});
    ctx.strokeStyle="#344049";ctx.strokeRect(left.x,left.y,left.w,left.h);ctx.fillStyle="#67737d";ctx.font="10px Inter, sans-serif";ctx.textAlign="center";ctx.fillText(String(config.nodesMin),left.x,left.y+left.h+18);ctx.fillText(String(Math.round((config.nodesMin+config.nodesMax)/2)),left.x+left.w/2,left.y+left.h+18);ctx.fillText(String(config.nodesMax),left.x+left.w,left.y+left.h+18);
    const familyX=split+18,familyW=Math.max(180,w-familyX-22),families=[...familyCounts.entries()].sort((a,b)=>b[1]-a[1]),visible=families.slice(0,8),rowH=22;
    ctx.fillStyle="#344049";ctx.font="700 12px Inter, sans-serif";ctx.textAlign="left";ctx.fillText(config.topology==="mixed"?"Weighted topology probability":"Topology selection",familyX,19);
    visible.forEach(([type,count],i)=>{const y=40+i*rowH,p=count/samples;ctx.fillStyle="#53616b";ctx.font="10px Inter, sans-serif";ctx.textAlign="left";ctx.fillText(topologyName(type),familyX,y);ctx.fillStyle="#edf0f2";ctx.fillRect(familyX,y+7,familyW,8);ctx.fillStyle="#37c0fb";ctx.fillRect(familyX,y+7,familyW*p,8);state.simulation.previewPoints.push({x:familyX,y:y+7,w:familyW,h:8,label:topologyName(type),detail:`${fmt(p*100,1)}% selection probability (${count.toLocaleString()} / ${samples.toLocaleString()} preview draws)`});});
    const nodeDescriptions={uniform:"Every integer in the vertex range has equal probability.",fixed:"Every system uses the rounded midpoint of the vertex range.",triangular:"Two uniform draws are averaged, concentrating systems near the midpoint.",normal:"A truncated normal draw concentrates most systems near the midpoint with lighter tails.",loguniform:"Equal log intervals have equal probability, so smaller systems occur more often."};
    const enabled=config.mixedWeights.filter(item=>item.enabled&&item.weight>0),totalWeight=enabled.reduce((sum,item)=>sum+item.weight,0),familyText=config.topology==="mixed"?`${enabled.length} enabled families are sampled by relative weight (${enabled.slice().sort((a,b)=>b.weight-a.weight).slice(0,3).map(item=>`${topologyName(item.type)} ${fmt(item.weight/totalWeight*100,1)}%`).join(", ")}${enabled.length>3?", …":""}).`:`Every system begins with the ${topologyName(config.topology)} generator.`;
    const subjectModes=[...new Set(config.templates.map(item=>`${item.coverageDistribution||"uniform"} coverage / ${item.multiplicityDistribution||"uniform"} multiplicity / ${item.anchorMode||"fixed"} anchor`))];
    const anchorModes=config.anchorTemplates.filter(item=>item.enabled).map(item=>`${item.name}: ${item.model}, ${item.minActors}–${item.maxActors} actors`).join("; ");
    explanation.innerHTML=`<div class="distribution-note"><strong>Vertex-count distribution</strong>${esc(nodeDescriptions[config.nodeDistribution]||nodeDescriptions.uniform)}</div><div class="distribution-note"><strong>Topology-family distribution</strong>${esc(familyText)}</div><div class="distribution-note"><strong>Modeling perturbations</strong>Generator parameters jitter by up to ±${fmt(config.parameterJitter,1)}%; ${fmt(config.edgeDropout,1)}% edge dropout and ${fmt(config.edgeAddition,1)}% extra-edge noise are then applied. Components are ${config.ensureConnected?"always connected":"connected with probability "+fmt(config.connectedChance,1)+"%"}.</div><div class="distribution-note"><strong>Anchor synthesis</strong>${esc(anchorModes||"No enabled anchors")}. One Cₐ is shared within each generated system.</div><div class="distribution-note"><strong>Profile synthesis</strong>${esc(subjectModes.join("; ")||"No templates")}.</div>`;
  }

  function hashSeed(text) {
    let h=2166136261>>>0;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }

  function mulberry32(seed) {
    return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
  }

  function randomInt(rng,min,max){return Math.floor(rng()*(max-min+1))+min;}

  function randomNormal(rng) {
    const u=Math.max(Number.MIN_VALUE,rng()),v=Math.max(Number.MIN_VALUE,rng());
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }

  function sampleRange(rng,min,max,distribution="uniform") {
    if(!(max>min))return min;
    let t;
    if(distribution==="fixed")t=.5;
    else if(distribution==="triangular")t=(rng()+rng())/2;
    else if(distribution==="normal")t=clamp(.5+randomNormal(rng)/6,0,1);
    else if(distribution==="loguniform"&&min>0)return Math.exp(Math.log(min)+rng()*(Math.log(max)-Math.log(min)));
    else if(distribution==="ushaped")t=rng()<.5?Math.pow(rng(),2):1-Math.pow(rng(),2);
    else t=rng();
    return min+t*(max-min);
  }

  function sampleIntegerRange(rng,min,max,distribution="uniform") {
    return clamp(Math.round(sampleRange(rng,min,max,distribution)),Math.ceil(min),Math.floor(max));
  }

  function sampleMultiplicity(rng,min,max,distribution="uniform") {
    if(distribution==="fixed")return Math.round((min+max)/2);
    if(distribution==="poisson"){
      const mean=(min+max)/2,L=Math.exp(-mean);let k=0,p=1;
      do{k++;p*=rng();}while(p>L&&k<max*6+30);
      return clamp(k-1,min,max);
    }
    if(distribution==="geometric"){
      const target=Math.max(1,(min+max)/2-min+1),p=1/target;
      const value=min+Math.floor(Math.log(Math.max(Number.MIN_VALUE,1-rng()))/Math.log(Math.max(Number.MIN_VALUE,1-p)));
      return clamp(value,min,max);
    }
    return randomInt(rng,min,max);
  }

  function weightedTopology(weights,rng) {
    const enabled=weights.filter(item=>item.enabled&&item.weight>0);
    if(!enabled.length)return "random";
    let cursor=rng()*enabled.reduce((sum,item)=>sum+item.weight,0);
    for(const item of enabled){cursor-=item.weight;if(cursor<=0)return item.type;}
    return enabled[enabled.length-1].type;
  }

  function parameterForSystem(config,type,index,rng) {
    const copy={...config};
    if(config.sweep&&config.topology!=="mixed"&&config.count>1){
      const value=config.sweepFrom+(config.sweepTo-config.sweepFrom)*(index/(config.count-1));
      if(type==="random"||type==="community"||type==="bipartite")copy.meanDegree=Math.max(1,value);
      else if(type==="regular")copy.regularDegree=Math.max(1,Math.round(value));
      else if(type==="ba")copy.attachment=Math.max(1,Math.round(value));
      else if(type==="smallworld")copy.beta=clamp(value,0,1);
      else if(type==="geometric")copy.radius=clamp(value,.001,.9);
      else if(type==="tree")copy.branching=Math.max(2,Math.round(value));
      else if(type==="core")copy.coreFraction=clamp(value,.01,.9);
      else if(type==="lollipop")copy.lollipopFraction=clamp(value,1,90);
    }
    const jitter=clamp(Number(config.parameterJitter)||0,0,100)/100;
    const vary=(key,min,max,integer=false)=>{const base=Number(copy[key]);if(!Number.isFinite(base))return;const value=clamp(base*(1+(rng()*2-1)*jitter),min,max);copy[key]=integer?Math.round(value):value;};
    if(jitter){
      vary("meanDegree",1,100);vary("regularDegree",1,100,true);vary("attachment",1,30,true);vary("neighbourhood",2,100,true);
      vary("beta",0,1);vary("radius",.001,.9);vary("branching",2,20,true);vary("coreFraction",.01,.9);vary("peripheryLinks",1,30,true);
      vary("communities",2,100,true);vary("communityIn",0,100);vary("bipartiteFraction",5,95);vary("lollipopFraction",1,90);
    }
    return copy;
  }

  function generateTopology(n,type,config,rng) {
    const adjSets=Array.from({length:n},()=>new Set());
    const edges=[];
    const positions=new Array(n);
    let connectionConstraint=null;
    const add=(a,b)=>{
      if(a===b||a<0||b<0||a>=n||b>=n||adjSets[a].has(b))return false;
      adjSets[a].add(b);adjSets[b].add(a);edges.push([a,b]);return true;
    };
    const remove=(a,b)=>{
      if(!adjSets[a].has(b))return false;
      adjSets[a].delete(b);adjSets[b].delete(a);
      const index=edges.findIndex(pair=>(pair[0]===a&&pair[1]===b)||(pair[0]===b&&pair[1]===a));
      if(index>=0)edges.splice(index,1);return true;
    };

    if(type==="path"){
      for(let i=1;i<n;i++)add(i-1,i);
    }else if(type==="star"){
      for(let i=1;i<n;i++)add(0,i);
    }else if(type==="ring"){
      for(let i=0;i<n;i++)add(i,(i+1)%n);
    }else if(type==="wheel"){
      if(n<4){for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)add(i,j);}
      else {for(let i=1;i<n;i++){add(0,i);add(i,i===n-1?1:i+1);}}
    }else if(type==="mesh"){
      const cols=Math.ceil(Math.sqrt(n));
      for(let i=0;i<n;i++){if(i%cols!==cols-1&&i+1<n)add(i,i+1);if(i+cols<n)add(i,i+cols);}
    }else if(type==="tree"){
      const branch=Math.max(2,Math.round(config.branching));
      for(let i=1;i<n;i++)add(Math.floor((i-1)/branch),i);
    }else if(type==="complete"){
      for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)add(i,j);
    }else if(type==="random"){
      const target=Math.min(n*(n-1)/2,Math.max(0,Math.round(n*config.meanDegree/2)));
      let attempts=0;
      while(edges.length<target&&attempts<target*15+100){add(randomInt(rng,0,n-1),randomInt(rng,0,n-1));attempts++;}
    }else if(type==="regular"){
      let degree=Math.min(n-1,Math.max(1,Math.round(config.regularDegree||config.meanDegree||2)));
      if((n*degree)%2)degree--;
      const order=shuffleInPlace(Array.from({length:n},(_,i)=>i),rng);
      for(let d=1;d<=Math.floor(degree/2);d++)for(let i=0;i<n;i++)add(order[i],order[(i+d)%n]);
      if(degree%2&&n%2===0)for(let i=0;i<n/2;i++)add(order[i],order[i+n/2]);
    }else if(type==="ba"){
      const m=Math.min(Math.max(1,Math.round(config.attachment)),Math.max(1,n-1));
      const initial=Math.min(n,m+1),pool=[];
      for(let i=0;i<initial;i++)for(let j=i+1;j<initial;j++){if(add(i,j)){pool.push(i,j);}}
      for(let v=initial;v<n;v++){
        const targets=new Set();
        while(targets.size<Math.min(m,v))targets.add(pool.length?pool[randomInt(rng,0,pool.length-1)]:randomInt(rng,0,v-1));
        for(const target of targets)if(add(v,target)){pool.push(v,target);}
      }
    }else if(type==="smallworld"){
      let k=Math.max(2,Math.min(n-1,Math.round(config.neighbourhood)));if(k%2)k--;
      for(let i=0;i<n;i++)for(let d=1;d<=k/2;d++)add(i,(i+d)%n);
      const originalCount=edges.length;
      for(let edgeIndex=0;edgeIndex<originalCount;edgeIndex++){
        const [a,b]=edges[edgeIndex];
        if(rng()>=config.beta)continue;
        let replacement,tries=0;
        do{replacement=randomInt(rng,0,n-1);tries++;}while((replacement===a||adjSets[a].has(replacement))&&tries<30);
        if(replacement!==a&&!adjSets[a].has(replacement)){
          adjSets[a].delete(b);adjSets[b].delete(a);adjSets[a].add(replacement);adjSets[replacement].add(a);edges[edgeIndex]=[a,replacement];
        }
      }
    }else if(type==="geometric"){
      const radius=config.radius,cell=Math.max(.002,radius),grid=new Map();
      for(let i=0;i<n;i++){
        const x=rng(),y=rng();positions[i]={x,y};
        const cx=Math.floor(x/cell),cy=Math.floor(y/cell),key=`${cx},${cy}`;
        if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);
      }
      const edgeCap=MAX_EDGES_PER_SYSTEM;
      outer:for(let i=0;i<n;i++){
        const {x,y}=positions[i],cx=Math.floor(x/cell),cy=Math.floor(y/cell);
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const j of grid.get(`${cx+dx},${cy+dy}`)||[]){
          if(j<=i)continue;
          const q=positions[j];if((x-q.x)**2+(y-q.y)**2<=radius*radius)add(i,j);
          if(edges.length>=edgeCap)break outer;
        }
      }
    }else if(type==="community"){
      const q=Math.min(n,Math.max(2,Math.round(config.communities||4))),order=shuffleInPlace(Array.from({length:n},(_,i)=>i),rng);
      const groups=Array.from({length:q},()=>[]),groupOf=new Int32Array(n);
      order.forEach((vertex,index)=>{const group=index%q;groups[group].push(vertex);groupOf[vertex]=group;});
      const target=Math.min(n*(n-1)/2,Math.max(0,Math.round(n*(config.meanDegree||4)/2))),inside=clamp(Number(config.communityIn??80)/100,0,1);
      let attempts=0;
      while(edges.length<target&&attempts<target*25+200){
        const a=randomInt(rng,0,n-1),same=rng()<inside;let b=-1;
        if(same&&groups[groupOf[a]].length>1){const pool=groups[groupOf[a]];do{b=pool[randomInt(rng,0,pool.length-1)];}while(b===a);}
        else {let tries=0;do{b=randomInt(rng,0,n-1);tries++;}while(groupOf[b]===groupOf[a]&&tries<20);}
        add(a,b);attempts++;
      }
    }else if(type==="bipartite"){
      const left=Math.min(n-1,Math.max(1,Math.round(n*clamp(Number(config.bipartiteFraction??50),5,95)/100)));
      connectionConstraint=(a,b)=>(a<left)!==(b<left);
      const target=Math.min(left*(n-left),Math.max(0,Math.round(n*(config.meanDegree||4)/2)));
      let attempts=0;while(edges.length<target&&attempts<target*20+100){add(randomInt(rng,0,left-1),randomInt(rng,left,n-1));attempts++;}
    }else if(type==="core"){
      const core=Math.min(n,Math.max(2,Math.round(n*config.coreFraction)));
      for(let i=0;i<core;i++)for(let j=i+1;j<core;j++)add(i,j);
      const links=Math.min(core,Math.max(1,Math.round(config.peripheryLinks)));
      for(let v=core;v<n;v++){
        const targets=new Set();while(targets.size<links)targets.add(randomInt(rng,0,core-1));
        for(const target of targets)add(v,target);
      }
    }else if(type==="lollipop"){
      const clique=Math.min(n-1,Math.max(2,Math.round(n*clamp(Number(config.lollipopFraction??25),1,90)/100)));
      for(let i=0;i<clique;i++)for(let j=i+1;j<clique;j++)add(i,j);
      for(let v=clique;v<n;v++)add(v-1,v);
    }

    const dropout=clamp(Number(config.edgeDropout)||0,0,95)/100;
    if(dropout>0){
      const kept=[];for(const [a,b] of edges){if(rng()<dropout){adjSets[a].delete(b);adjSets[b].delete(a);}else kept.push([a,b]);}
      edges.length=0;for(const edge of kept)edges.push(edge);
    }
    const additions=Math.round(edges.length*clamp(Number(config.edgeAddition)||0,0,500)/100);
    let addAttempts=0,added=0;
    while(added<additions&&addAttempts<additions*25+100){if(add(randomInt(rng,0,n-1),randomInt(rng,0,n-1)))added++;addAttempts++;}
    const connect=Boolean(config.ensureConnected)||rng()*100<clamp(Number(config.connectedChance)||0,0,100);
    if(connect)connectComponents(adjSets,edges,rng,connectionConstraint);
    const adj=adjSets.map(set=>Array.from(set));
    return {n,type,adj,edges,positions};
  }

  function connectComponents(adjSets,edges,rng,constraint=null) {
    const n=adjSets.length,seen=new Uint8Array(n),components=[];
    for(let start=0;start<n;start++){
      if(seen[start])continue;
      const stack=[start];seen[start]=1;const members=[];
      while(stack.length){const v=stack.pop();members.push(v);for(const w of adjSets[v])if(!seen[w]){seen[w]=1;stack.push(w);}}
      components.push(members);
    }
    if(components.length<2)return;
    const merged=components[0].slice();
    for(let cursor=1;cursor<components.length;cursor++){
      let selectedIndex=cursor,a=merged[randomInt(rng,0,merged.length-1)],b=components[cursor][randomInt(rng,0,components[cursor].length-1)],found=!constraint||constraint(a,b);
      if(constraint&&!found){
        outer:for(let i=cursor;i<components.length;i++)for(const candidateA of merged)for(const candidateB of components[i])if(constraint(candidateA,candidateB)){selectedIndex=i;a=candidateA;b=candidateB;found=true;break outer;}
      }
      if(selectedIndex!==cursor)[components[cursor],components[selectedIndex]]=[components[selectedIndex],components[cursor]];
      const next=components[cursor];
      if(!found){a=merged[randomInt(rng,0,merged.length-1)];b=next[randomInt(rng,0,next.length-1)];}
      if(!adjSets[a].has(b)){adjSets[a].add(b);adjSets[b].add(a);edges.push([a,b]);}
      for(const vertex of next)merged.push(vertex);
    }
  }

  function selectSupportVertices(adj,count,placement,rng,topologyAnalysis=null) {
    const n=adj.length;count=clamp(count,1,n);
    if(placement==="clustered"||placement==="twoClusters"){
      const selected=[],seen=new Uint8Array(n),queue=[randomInt(rng,0,n-1)];seen[queue[0]]=1;
      const firstTarget=placement==="twoClusters"?Math.ceil(count/2):count;
      for(let cursor=0;cursor<queue.length&&selected.length<firstTarget;cursor++){
        const v=queue[cursor];selected.push(v);
        const neighbours=adj[v].slice();shuffleInPlace(neighbours,rng);
        for(const w of neighbours)if(!seen[w]){seen[w]=1;queue.push(w);}
      }
      if(placement==="twoClusters"&&selected.length<count){
        const available=Array.from({length:n},(_,i)=>i).filter(i=>!seen[i]);
        if(available.length){const second=[available[randomInt(rng,0,available.length-1)]];seen[second[0]]=1;for(let cursor=0;cursor<second.length&&selected.length<count;cursor++){const v=second[cursor];selected.push(v);const neighbours=adj[v].slice();shuffleInPlace(neighbours,rng);for(const w of neighbours)if(!seen[w]){seen[w]=1;second.push(w);}}}
      }
      if(selected.length<count){const rest=Array.from({length:n},(_,i)=>i).filter(i=>!seen[i]);shuffleInPlace(rest,rng);selected.push(...rest.slice(0,count-selected.length));}
      return selected;
    }
    const vertices=Array.from({length:n},(_,i)=>i);
    if(placement==="high")vertices.sort((a,b)=>adj[b].length-adj[a].length||a-b);
    else if(placement==="low"||placement==="endpoints")vertices.sort((a,b)=>adj[a].length-adj[b].length||a-b);
    else if(placement==="articulation"||placement==="nonarticulation"){
      const marks=(topologyAnalysis||analyzeTopology(adj)).articulation;
      vertices.sort((a,b)=>(placement==="articulation"?marks[b]-marks[a]:marks[a]-marks[b])||adj[b].length-adj[a].length||a-b);
    }
    else shuffleInPlace(vertices,rng);
    if((placement==="high"||placement==="low"||placement==="endpoints"||placement==="articulation"||placement==="nonarticulation")&&count<n){
      const boundary=Math.min(n,Math.max(count,Math.ceil(count*1.5))),pool=vertices.slice(0,boundary);shuffleInPlace(pool,rng);return pool.slice(0,count);
    }
    return vertices.slice(0,count);
  }

  function relateSupport(base,count,relation,strength,previous,n,rng) {
    if(!previous?.length||relation==="independent")return base.slice(0,count);
    const prior=shuffleInPlace([...new Set(previous)],rng),priorSet=new Set(prior),baseUnique=[...new Set(base)];
    const target=Math.min(count,Math.round(Math.min(count,prior.length)*clamp(strength,0,100)/100));
    let selected=[];
    if(relation==="overlap"||relation==="nested")selected=prior.slice(0,target);
    else if(relation==="avoid")selected=baseUnique.filter(vertex=>!priorSet.has(vertex)).slice(0,Math.min(count,Math.round(count*clamp(strength,0,100)/100)));
    const selectedSet=new Set(selected);
    const fill=[...baseUnique,...Array.from({length:n},(_,i)=>i)];
    if(relation==="avoid")fill.sort((a,b)=>Number(priorSet.has(a))-Number(priorSet.has(b)));
    for(const vertex of fill)if(selected.length<count&&!selectedSet.has(vertex)){selected.push(vertex);selectedSet.add(vertex);}
    return selected.slice(0,count);
  }

  function shuffleInPlace(array,rng){for(let i=array.length-1;i>0;i--){const j=randomInt(rng,0,i);[array[i],array[j]]=[array[j],array[i]];}return array;}

  function weightedAnchorTemplate(templates,rng) {
    const enabled=templates.filter(item=>item.enabled&&Number(item.weight)>0);if(!enabled.length)return templates[0];
    let cursor=rng()*enabled.reduce((sum,item)=>sum+Number(item.weight),0);
    for(const item of enabled){cursor-=Number(item.weight);if(cursor<=0)return item;}return enabled[enabled.length-1];
  }

  function resolveSubjectAnchorTemplate(item,anchorTemplates,rng) {
    const enabled=anchorTemplates.filter(anchor=>anchor.enabled&&Number(anchor.weight)>0);
    if(item.anchorMode==="random")return weightedAnchorTemplate(enabled,rng);
    if(item.anchorMode==="infer"){
      const type=inferAnchorType(item.name),matches=enabled.filter(anchor=>anchor.type===type);
      if(matches.length)return weightedAnchorTemplate(matches,rng);
    }
    return enabled.find(anchor=>anchor.id===item.anchorId)||enabled.find(anchor=>anchor.type===inferAnchorType(item.name))||weightedAnchorTemplate(enabled,rng);
  }

  function synthesizeAnchorCenterFamily(template,topology,rng) {
    const n=topology.n,id=slugify(template.id||template.name,"anchor"),type=template.type||"custom";
    let mode=template.model||"realistic-mixture";
    if(mode==="realistic-mixture")mode=choose(rng,REALISTIC_CENTER_MODELS[type]||REALISTIC_CENTER_MODELS.custom);
    if(mode==="singleton")return {id,name:template.name,type,color:template.color,model:mode,regions:[],memberships:Array.from({length:n},(_,vertex)=>[`vertex:v${vertex+1}`])};
    const stems=CENTER_NAME_STEMS[type]||CENTER_NAME_STEMS.custom;
    if(mode==="single-operator"){
      const region={id:`${id}-center-1`,name:stems[0],color:CENTER_COLORS[0],vertices:Array.from({length:n},(_,index)=>index)};
      return {id,name:template.name,type,color:template.color,model:mode,regions:[region],memberships:Array.from({length:n},()=>[region.id])};
    }
    const min=Math.min(n,Math.max(1,Math.round(template.minActors||1))),max=Math.min(n,Math.max(min,Math.round(template.maxActors||min))),count=randomInt(rng,min,max);
    if(count===1)return synthesizeAnchorCenterFamily({...template,model:"single-operator"},topology,rng);
    const memberships=Array.from({length:n},()=>[]),regions=Array.from({length:count},(_,index)=>({id:`${id}-center-${index+1}`,name:index?`${stems[index%stems.length]} ${index+1}`:stems[0],color:CENTER_COLORS[index%CENTER_COLORS.length],vertices:[]}));
    const assign=(vertex,regionIndex)=>{const region=regions[regionIndex];if(!memberships[vertex].includes(region.id)){memberships[vertex].push(region.id);region.vertices.push(vertex);}};
    if(mode==="topological"||mode==="hub-led"){
      const vertices=Array.from({length:n},(_,index)=>index),degrees=vertices.map(index=>topology.adj[index].length);
      const seeds=mode==="hub-led"?[...vertices].sort((a,b)=>degrees[b]-degrees[a]).slice(0,count):shuffleInPlace(vertices.slice(),rng).slice(0,count);
      const owner=new Int32Array(n);owner.fill(-1);const queue=[];
      seeds.forEach((vertex,index)=>{owner[vertex]=index;queue.push(vertex);});
      for(let cursor=0;cursor<queue.length;cursor++){
        const vertex=queue[cursor],neighbours=shuffleInPlace(topology.adj[vertex].slice(),rng);
        for(const next of neighbours)if(owner[next]===-1){owner[next]=owner[vertex];queue.push(next);}
      }
      for(let vertex=0;vertex<n;vertex++){if(owner[vertex]===-1)owner[vertex]=randomInt(rng,0,count-1);assign(vertex,owner[vertex]);}
    }else{
      const dominant=clamp(Number(template.dominantShare||50),1,100)/100;
      for(let vertex=0;vertex<n;vertex++){
        const regionIndex=rng()<dominant?0:randomInt(rng,1,count-1);assign(vertex,regionIndex);
      }
      for(let regionIndex=0;regionIndex<count;regionIndex++)if(!regions[regionIndex].vertices.length)assign(randomInt(rng,0,n-1),regionIndex);
    }
    const overlap=clamp(Number(template.overlapChance)||0,0,100)/100;
    if((mode==="overlapping-consortium"||overlap>0)&&count>1){
      const chance=mode==="overlapping-consortium"?Math.max(.18,overlap):overlap;
      for(let vertex=0;vertex<n;vertex++)if(rng()<chance){const occupied=new Set(memberships[vertex]);const candidates=regions.map((_,index)=>index).filter(index=>!occupied.has(regions[index].id));if(candidates.length)assign(vertex,choose(rng,candidates));}
    }
    return {id,name:template.name,type,color:template.color,model:mode,regions,memberships};
  }

  function synthesizeSubjects(topology,templates,rng,anchorTemplates=state.simulation.anchorTemplates) {
    const results=[],topologyAnalysis=analyzeTopology(topology.adj);let previousSupport=[];
    for(const item of templates){
      const epsilon=Math.max(.0001,Number(item.epsilon)*(1+(rng()*2-1)*clamp(Number(item.epsilonJitter)||0,0,100)/100));
      const pct=sampleRange(rng,item.coverageMin,item.coverageMax,item.coverageDistribution||"uniform");
      let lambda=clamp(Math.round(topology.n*pct/100),1,topology.n);
      if(item.relation==="nested"&&Number(item.relationStrength)>=100&&previousSupport.length)lambda=Math.min(lambda,previousSupport.length);
      const selectionCount=Math.min(topology.n,Math.max(lambda,Math.ceil(lambda*1.7)));
      const base=selectSupportVertices(topology.adj,selectionCount,item.placement,rng,topologyAnalysis);
      const support=relateSupport(base,lambda,item.relation,item.relationStrength,previousSupport,topology.n,rng);
      const counts=support.map(()=>sampleMultiplicity(rng,item.multiplicityMin,item.multiplicityMax,item.multiplicityDistribution||"uniform"));
      const delta=counts.reduce((sum,value)=>sum+value,0);
      const resolvedAnchor=resolveSubjectAnchorTemplate(item,anchorTemplates,rng);
      results.push({...item,anchorId:resolvedAnchor.id,anchor:resolvedAnchor.name,anchorType:resolvedAnchor.type,epsilon,delta,supportIndices:support,counts});previousSupport=support;
    }
    const anchorFamilies=new Map();
    for(const item of results){
      if(!anchorFamilies.has(item.anchorId)){
        const template=anchorTemplates.find(anchor=>anchor.id===item.anchorId)||defaultSimulationAnchor(item.anchorType);
        anchorFamilies.set(item.anchorId,synthesizeAnchorCenterFamily(template,topology,rng));
      }
      const family=anchorFamilies.get(item.anchorId),centerMemberships=item.supportIndices.map(vertex=>family.memberships[vertex]);
      item.centerMemberships=centerMemberships;
      item.centerIds=[...new Set(centerMemberships.flat())];
    }
    results.generatedAnchors=[...anchorFamilies.values()];
    return results;
  }

  function simulationDrawForIndex(config,index) {
    const seed=hashSeed(`${config.seed}:${index}`),rng=mulberry32(seed);
    const type=config.topology==="mixed"?weightedTopology(config.mixedWeights,rng):config.topology;
    const n=sampleIntegerRange(rng,config.nodesMin,config.nodesMax,config.nodeDistribution||"uniform");
    const systemConfig=parameterForSystem(config,type,index,rng);
    return {seed,rng,type,n,systemConfig};
  }

  function createSimulationSystem(config,index,withModel=false) {
    const {seed,rng,type,n,systemConfig}=simulationDrawForIndex(config,index);
    const topology=generateTopology(n,type,systemConfig,rng);
    const subjects=synthesizeSubjects(topology,config.templates,rng,config.anchorTemplates);
    const evaluation=evaluateIndexedSystem({
      id:`sim-${state.simulation.batchId}-${index+1}`,
      name:`Simulation ${index+1} · ${topologyName(type)} · n=${n}`,
      source:"simulation",n,adj:topology.adj,
      subjectInputs:subjects.map(item=>({id:item.id,name:item.name,anchorId:item.anchorId,anchor:item.anchor,color:item.color,delta:item.delta,epsilon:item.epsilon,supportIndices:item.supportIndices,centerIds:item.centerIds})),
      nodeLabel:i=>`v${i+1}`,
      metadata:{index,seed,type,preset:config.preset||state.simulation.preset,randomization:{nodeDistribution:config.nodeDistribution,parameterJitter:config.parameterJitter,edgeDropout:config.edgeDropout,edgeAddition:config.edgeAddition,ensureConnected:config.ensureConnected,connectedChance:config.connectedChance,anchors:subjects.generatedAnchors.map(anchor=>({id:anchor.id,name:anchor.name,type:anchor.type,model:anchor.model,centerCount:anchor.regions.length}))},citation:PAPER_CITATION}
    });
    if(withModel){
      const positions=positionsForTopology(topology);
      evaluation.model={
        graph:{nodes:Array.from({length:n},(_,i)=>({id:`v${i+1}`,label:`v${i+1}`,x:positions[i].x,y:positions[i].y})),edges:topology.edges.map(([a,b],i)=>({id:`e${i+1}`,a:`v${a+1}`,b:`v${b+1}`}))},
        anchors:subjects.generatedAnchors.map(anchor=>({id:anchor.id,name:anchor.name,type:anchor.type,color:anchor.color,regions:anchor.regions.map(region=>({id:region.id,name:region.name,color:region.color,vertices:region.vertices.map(vertex=>`v${vertex+1}`)}))})),
        subjects:subjects.map(item=>({id:item.id,name:item.name,anchorId:item.anchorId,anchor:item.anchor,color:item.color,epsilon:item.epsilon,delta:item.delta,realizations:Object.fromEntries(item.supportIndices.map((v,i)=>[`v${v+1}`,item.counts[i]]))}))
      };
    }
    return evaluation;
  }

  function positionsForTopology(topology) {
    const {n,type}=topology;
    const span=PLANE_SIZE-PLANE_PAD*2;
    const suppliedPositions=topology.positions?.length===n?Array.from({length:n},(_,i)=>topology.positions[i]):null;
    if(suppliedPositions?.every(point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y)))return suppliedPositions.map(point=>({x:PLANE_PAD+point.x*span,y:PLANE_PAD+point.y*span}));
    if(type==="star")return Array.from({length:n},(_,i)=>i===0?{x:PLANE_CENTER,y:PLANE_CENTER}:{x:PLANE_CENTER+Math.cos(-Math.PI/2+(i-1)/Math.max(1,n-1)*Math.PI*2)*(PLANE_CENTER-PLANE_PAD),y:PLANE_CENTER+Math.sin(-Math.PI/2+(i-1)/Math.max(1,n-1)*Math.PI*2)*(PLANE_CENTER-PLANE_PAD)});
    if(type==="ring")return Array.from({length:n},(_,i)=>({x:PLANE_CENTER+Math.cos(-Math.PI/2+i/Math.max(1,n)*Math.PI*2)*(PLANE_CENTER-PLANE_PAD),y:PLANE_CENTER+Math.sin(-Math.PI/2+i/Math.max(1,n)*Math.PI*2)*(PLANE_CENTER-PLANE_PAD)}));
    if(type==="wheel")return Array.from({length:n},(_,i)=>i===0?{x:PLANE_CENTER,y:PLANE_CENTER}:{x:PLANE_CENTER+Math.cos(-Math.PI/2+(i-1)/Math.max(1,n-1)*Math.PI*2)*(PLANE_CENTER-PLANE_PAD),y:PLANE_CENTER+Math.sin(-Math.PI/2+(i-1)/Math.max(1,n-1)*Math.PI*2)*(PLANE_CENTER-PLANE_PAD)});
    if(type==="path"){
      const cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);
      return Array.from({length:n},(_,i)=>{const row=Math.floor(i/cols),column=i%cols,xIndex=row%2?cols-1-column:column;return{x:PLANE_PAD+xIndex*(span/Math.max(1,cols-1)),y:PLANE_PAD+row*(span/Math.max(1,rows-1))};});
    }
    if(type==="mesh"){
      const cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);
      return Array.from({length:n},(_,i)=>({x:PLANE_PAD+(i%cols)*(span/Math.max(1,cols-1)),y:PLANE_PAD+Math.floor(i/cols)*(span/Math.max(1,rows-1))}));
    }
    if(type==="tree"){
      const levels=[],depth=new Int32Array(n);
      for(let i=1;i<n;i++)depth[i]=depth[Math.floor((i-1)/3)]+1;
      for(let i=0;i<n;i++){if(!levels[depth[i]])levels[depth[i]]=[];levels[depth[i]].push(i);}
      const out=new Array(n);levels.forEach((level,d)=>level.forEach((v,j)=>out[v]={x:PLANE_PAD+(j+.5)*(span/level.length),y:PLANE_PAD+d*(span/Math.max(1,levels.length-1))}));return out;
    }
    if(n<=900){
      const model={nodes:Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i/n*Math.PI*2;return{id:String(i),x:PLANE_CENTER+Math.cos(a)*(PLANE_CENTER-PLANE_PAD-20),y:PLANE_CENTER+Math.sin(a)*(PLANE_CENTER-PLANE_PAD-20)};}),edges:topology.edges.map(([a,b],i)=>({id:String(i),a:String(a),b:String(b)}))};
      forceLayout(model);return model.nodes.map(node=>({x:node.x,y:node.y}));
    }
    const cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);
    return Array.from({length:n},(_,i)=>({x:PLANE_PAD+(i%cols)*(span/Math.max(1,cols-1)),y:PLANE_PAD+Math.floor(i/cols)*(span/Math.max(1,rows-1))}));
  }

  function topologyName(type){return({path:"Path / chain",star:"Star",ring:"Ring",wheel:"Wheel",mesh:"2D square mesh",tree:"Balanced tree",random:"Random G(n,m)",regular:"Random regular",ba:"Scale-free",smallworld:"Small-world",geometric:"Random geometric",community:"Community / block",bipartite:"Random bipartite",core:"Core–periphery",lollipop:"Lollipop",complete:"Complete"})[type]||type;}

  async function runSimulations() {
    const config=readSimulationConfig(),validation=validateSimulationConfig(config);
    if(!validation.valid){toast("Resolve simulation configuration errors first.","error");return;}
    state.simulation.running=true;state.simulation.cancelled=false;state.simulation.batchId++;
    state.simulation.lastConfig=clone(config);state.simulation.results=[];
    state.results.visibleRecords=[];state.results.sharedGroups=[];state.results.previewCache={key:null,data:null};
    $("#runSimulationBtn").disabled=true;$("#cancelSimulationBtn").classList.remove("hidden");$("#simProgressWrap").classList.remove("hidden");$("#simComplete").classList.add("hidden");
    const started=performance.now();let lastYield=started;
    try{
      for(let i=0;i<config.count;i++){
        if(state.simulation.cancelled)break;
        state.simulation.results.push(createSimulationSystem(config,i,false));
        const now=performance.now();
        if(now-lastYield>35||i===config.count-1){
          const pct=(i+1)/config.count*100;$("#simProgressBar").style.width=`${pct}%`;$("#simProgressText").textContent=`${(i+1).toLocaleString()} / ${config.count.toLocaleString()} systems`;
          await new Promise(resolve=>setTimeout(resolve,0));lastYield=performance.now();
        }
      }
      const completed=state.simulation.results.length;
      $("#simComplete").classList.remove("hidden");
      $("#simComplete").innerHTML=`<strong>${state.simulation.cancelled?"Batch stopped":"Batch complete"}:</strong> ${completed.toLocaleString()} system${completed===1?"":"s"} evaluated in ${fmt((performance.now()-started)/1000,2)} s. <button class="mini-btn" data-go="results" type="button">Open results</button>`;
      if(completed){state.results.selectedSystem=state.simulation.results[0].id;state.results.previewSystem=state.simulation.results[0].id;state.results.page=1;renderResults();toast(`${completed.toLocaleString()} simulated systems evaluated.`);}
    }catch(error){console.error(error);toast(`Simulation failed: ${error.message}`,"error",8000);$("#simComplete").classList.remove("hidden");$("#simComplete").textContent=`The batch stopped after ${state.simulation.results.length} systems: ${error.message}`;}
    finally{state.simulation.running=false;$("#cancelSimulationBtn").classList.add("hidden");updateSimulationEstimate();}
  }

  function cancelSimulations(){state.simulation.cancelled=true;$("#cancelSimulationBtn").disabled=true;$("#simProgressText").textContent="Stopping after the current system…";setTimeout(()=>$("#cancelSimulationBtn").disabled=false,800);}

  function loadSimulationToCanvas(systemId) {
    const result=state.simulation.results.find(item=>item.id===systemId);
    if(!result||!state.simulation.lastConfig)return;
    if(result.n>EXACT_PREVIEW_LIMIT||result.m>EXACT_PREVIEW_EDGE_LIMIT){
      state.results.previewSystem=result.id;renderSystemPreviewSelector();renderSystemPreview(result.id);setActiveView("results");
      toast(`This model is too large for the editable SVG canvas. Its square-plane schematic is open in Results; evaluation still used the complete Gₜ.`,"warning",7000);return;
    }
    const full=createSimulationSystem(state.simulation.lastConfig,result.metadata.index,true);
    pushHistory();state.graph=full.model.graph;state.subjects=full.model.subjects;state.anchors=full.model.anchors;state.activeAnchorId=state.anchors[0]?.id||null;state.currentEvaluation=full;state.currentEvaluation.id="current";state.currentEvaluation.name=`Workspace · ${result.name}`;state.currentEvaluation.source="current";
    state.selected=null;state.assignCenter=null;state.viewBox={x:0,y:0,w:PLANE_SIZE,h:PLANE_SIZE};syncSimulationTemplates(false);refreshWorkspace();fitGraph();setActiveView("workspace");toast("Loaded the generated system, including its system-level anchor families, onto the editable square canvas. Undo restores the previous workspace.");
  }
