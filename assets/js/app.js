"use strict";
  function initializeEvents() {
    $$(".tab").forEach(button=>button.addEventListener("click",()=>setActiveView(button.dataset.view)));
    document.addEventListener("click",event=>{
      const go=event.target.closest("[data-go]");if(go)setActiveView(go.dataset.go);
    });
    $("#exampleSelect").addEventListener("change",updateExampleNote);
    $("#loadExampleBtn").addEventListener("click",()=>loadExample($("#exampleSelect").value,true));
    $("#importBtn").addEventListener("click",()=>$("#fileInput").click());
    $("#fileInput").addEventListener("change",event=>importFile(event.target.files[0]));
    $("#exportSnapshotBtn").addEventListener("click",exportSnapshot);
    $("#evaluateBtn").addEventListener("click",evaluateCurrent);
    $("#evaluatePanelBtn").addEventListener("click",evaluateCurrent);
    $("#singleAddCompareBtn").addEventListener("click",addCurrentToComparison);
    $("#compareAddCanvasBtn").addEventListener("click",addCurrentToComparison);
    $("#compareUploadBtn").addEventListener("click",()=>$("#compareUploadInput").click());
    $("#compareUploadInput").addEventListener("change",event=>handleComparisonUploads(event.target.files));
    $("#compareAddBatchBtn").addEventListener("click",addBatchToComparison);
    $("#compareClearBtn").addEventListener("click",clearComparison);
    $("#compareReferenceSelect").addEventListener("change",event=>{state.compare.referenceId=event.target.value;renderComparison();});
    $("#compareScope").addEventListener("change",event=>{state.compare.scope=event.target.value;if(state.compare.scope==="matched"&&state.compare.mode==="aggregate"){const reference=state.compare.systems.find(item=>item.id===state.compare.referenceId);state.compare.subjectSet=reference?comparisonSubjectSetKey(reference.evaluation):null;}renderComparison();});
    $("#compareMode").addEventListener("change",event=>{state.compare.mode=event.target.value;state.compare.referenceId=null;renderComparison();});
    $("#compareSetSelect").addEventListener("change",event=>{state.compare.subjectSet=event.target.value;state.compare.referenceId=null;renderComparison();});
    $("#compareSubjectSelect").addEventListener("change",event=>{state.compare.subject=event.target.value;state.compare.referenceId=null;renderComparison();});
    $("#compareTableBody").addEventListener("click",event=>{const remove=event.target.closest("[data-compare-remove]");if(remove)removeComparisonSystem(remove.dataset.compareRemove);const load=event.target.closest("[data-compare-load]");if(load)loadComparisonToCanvas(load.dataset.compareLoad);});
    $("#singleVectorChart").addEventListener("mousemove",event=>handleCompactChartPointer(event,state.single.chartPoints,$("#singleChartTooltip")));$("#singleVectorChart").addEventListener("mouseleave",()=>$("#singleChartTooltip").classList.add("hidden"));
    $("#comparisonVectorChart").addEventListener("mousemove",event=>handleCompactChartPointer(event,state.compare.chartPoints,$("#comparisonChartTooltip")));$("#comparisonVectorChart").addEventListener("mouseleave",()=>$("#comparisonChartTooltip").classList.add("hidden"));
    $("#addSubjectBtn").addEventListener("click",addSubject);
    $("#undoBtn").addEventListener("click",undo);$("#redoBtn").addEventListener("click",redo);
    $$(".tool[data-tool]").forEach(button=>button.addEventListener("click",()=>setTool(button.dataset.tool)));
    $("#fitGraphBtn").addEventListener("click",fitGraph);
    $("#applyLayoutBtn").addEventListener("click",()=>applyLayout($("#layoutSelect").value));
    const canvas=$("#graphCanvas");
    canvas.addEventListener("pointerdown",handleCanvasPointerDown);
    canvas.addEventListener("pointermove",handleCanvasPointerMove);
    canvas.addEventListener("pointerup",handleCanvasPointerUp);
    canvas.addEventListener("pointercancel",handleCanvasPointerUp);
    canvas.addEventListener("wheel",handleCanvasWheel,{passive:false});
    canvas.addEventListener("keydown",event=>{
      const node=event.target.closest(".node");if(!node)return;
      if(event.key==="Delete"||event.key==="Backspace"){event.preventDefault();removeVertex(node.dataset.nodeId);}
      if(event.key==="Enter"||event.key===" "){event.preventDefault();state.selected={type:"node",id:node.dataset.nodeId};renderGraph();renderSelectionInspector();}
    });
    $("#subjectList").addEventListener("click",handleSubjectListClick);
    $("#subjectList").addEventListener("focusin",event=>{if(event.target.matches("[data-field]"))state.fieldSnapshot=captureModel();});
    $("#subjectList").addEventListener("input",handleSubjectFieldInput);
    $("#subjectList").addEventListener("change",handleSubjectFieldChange);
    $(".subject-panel").addEventListener("click",event=>{
      if(event.target.closest("[data-editor-pane], [data-add-anchor], [data-randomize-anchors], [data-anchor-action]"))handleAnchorEditorClick(event);
    });
    $("#anchorEditorPane").addEventListener("focusin",event=>{if(event.target.matches("[data-anchor-field]"))state.fieldSnapshot=captureModel();});
    $("#anchorEditorPane").addEventListener("input",handleAnchorEditorInput);
    $("#anchorEditorPane").addEventListener("change",handleAnchorEditorChange);
    $("#centerCanvasBar").addEventListener("click",handleCanvasAnchorBar);
    $("#centerCanvasBar").addEventListener("change",handleCanvasAnchorBar);

    $("#randomizePresetBtn").addEventListener("click",applySimulationPreset);
    $("#randomizeSimAnchorsBtn").addEventListener("click",randomizeSimulationAnchors);
    $("#simPreset").addEventListener("change",()=>{renderPresetDescription();updateSimulationEstimate();});
    $("#syncSubjectsBtn").addEventListener("click",()=>{syncSimulationTemplates(true);updateSimulationEstimate();toast("Simulation subject templates synced to the workspace.");});
    $("#simSubjectList").addEventListener("input",handleSimulationTemplateInput);
    $("#simSubjectList").addEventListener("change",handleSimulationTemplateInput);
    $("#simAnchorList").addEventListener("input",handleSimulationAnchorInput);
    $("#simAnchorList").addEventListener("change",handleSimulationAnchorInput);
    $$("#simulateView input, #simulateView select").filter(el=>!el.closest("#simSubjectList")).forEach(element=>element.addEventListener("input",updateSimulationEstimate));
    $("#simTopology").addEventListener("change",updateSimulationEstimate);
    $("#simSweep").addEventListener("change",event=>{$("#simSweepFrom").disabled=!event.target.checked;$("#simSweepTo").disabled=!event.target.checked;updateSimulationEstimate();});
    $("#runSimulationBtn").addEventListener("click",runSimulations);$("#cancelSimulationBtn").addEventListener("click",cancelSimulations);

    const resultControls=["#resultScope","#chartType","#colorBy","#classFilter","#metricFocus","#showSubjects","#showAggregate","#showVectorLines","#showLabels","#normalizeLength"];
    resultControls.forEach(selector=>$(selector).addEventListener("change",()=>{state.results.page=1;renderResults();}));
    $("#resultSubjectFilters").addEventListener("change",event=>{const input=event.target.closest("[data-result-subject]");if(!input)return;state.results.subjectEnabled[input.dataset.resultSubject]=input.checked;state.results.page=1;renderResults();});
    $("#resetDisplayBtn").addEventListener("click",resetDisplay);
    $("#resultSearch").addEventListener("input",()=>{state.results.page=1;renderResultsTable(state.results.visibleRecords);});
    $("#resultSort").addEventListener("change",()=>{state.results.page=1;renderResultsTable(state.results.visibleRecords);});
    $("#prevPageBtn").addEventListener("click",()=>{state.results.page--;renderResultsTable(state.results.visibleRecords);});
    $("#nextPageBtn").addEventListener("click",()=>{state.results.page++;renderResultsTable(state.results.visibleRecords);});
    $("#resultsTableBody").addEventListener("click",event=>{
      const preview=event.target.closest("[data-preview-system]");
      if(preview){state.results.previewSystem=preview.dataset.previewSystem;renderSystemPreviewSelector();renderSystemPreview(state.results.previewSystem);setResultPanel("preview");$("#systemPreviewPanel").scrollIntoView({behavior:"smooth",block:"start"});}
      const explain=event.target.closest("[data-explain-system]");
      if(explain){state.results.selectedSystem=explain.dataset.explainSystem;renderSummaryCards();renderAnalysisSelector();renderAnalysis(state.results.selectedSystem);setResultPanel("analysis");$("#analysisPanel").scrollIntoView({behavior:"smooth",block:"start"});}
      const load=event.target.closest("[data-load-system]");if(load)loadSimulationToCanvas(load.dataset.loadSystem);
    });
    $("#analysisSystemSelect").addEventListener("change",event=>{state.results.selectedSystem=event.target.value;renderSummaryCards();renderAnalysis(event.target.value);if($("#resultScope").value==="selected")renderResults();});
    ["#sharedMetric","#sharedPrecision","#sharedMinSize"].forEach(selector=>$(selector).addEventListener("change",()=>renderSharedValueAnalysis(state.results.visibleRecords)));
    $("#previewSystemSelect").addEventListener("change",event=>{state.results.previewSystem=event.target.value;renderSystemPreview(event.target.value);});
    $("#previewMode").addEventListener("change",event=>{state.results.previewMode=event.target.value;state.results.previewCache={key:null,data:null};renderSystemPreview(state.results.previewSystem);});
    $("#resultsChart").addEventListener("mousemove",handleChartPointer);$("#resultsChart").addEventListener("mouseleave",()=>$("#chartTooltip").classList.add("hidden"));
    $("#sharedValueChart").addEventListener("mousemove",handleSharedChartPointer);$("#sharedValueChart").addEventListener("mouseleave",()=>$("#sharedChartTooltip").classList.add("hidden"));
    $("#simulationDistributionPreview").addEventListener("mousemove",handleSimulationChartPointer);$("#simulationDistributionPreview").addEventListener("mouseleave",()=>$("#simulationChartTooltip").classList.add("hidden"));
    $$("[data-result-panel]").forEach(button=>button.addEventListener("click",()=>setResultPanel(button.dataset.resultPanel)));
    $("#downloadCsvBtn").addEventListener("click",exportResultsCsv);$("#downloadResultsJsonBtn").addEventListener("click",exportResultsJson);

    document.addEventListener("keydown",event=>{
      const tag=document.activeElement?.tagName;if(tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA")return;
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z"){event.preventDefault();event.shiftKey?redo():undo();}
      else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="y"){event.preventDefault();redo();}
      else if(event.key==="Delete"&&state.selected){event.preventDefault();state.selected.type==="node"?removeVertex(state.selected.id):removeEdge(state.selected.id);}
      else if(event.key==="Escape"){state.edgeStart=null;setTool("select");}
    });
    let resizeTimer;
    window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(state.activeView==="results"&&batchEvaluations().length){renderChart(state.results.visibleRecords);drawSharedValueChart(state.results.sharedGroups,$("#sharedMetric").value);renderSystemPreview(state.results.previewSystem);}else if(state.activeView==="single"&&state.currentEvaluation)renderSingleResults();else if(state.activeView==="compare"&&state.compare.systems.length)renderComparison();else if(state.activeView==="simulate")drawSimulationDistributionPreview(readSimulationConfig());},120);});
  }

  function init() {
    const select=$("#exampleSelect");
    select.innerHTML=Object.entries(EXAMPLES).map(([key,value])=>`<option value="${esc(key)}">${esc(value.name)}</option>`).join("");
    renderMixedFamilyWeights();
    initializeEvents();
    loadExample("flVanilla",false);
    runPaperBenchmarks();
    renderValidation();
    renderPresetDescription();
    updateSimulationEstimate();
    renderResults();
    renderSingleResults();
    renderComparison();
  }

  globalThis.DecentralizationSandboxCore = {
    EXAMPLES,
    evaluateGraphModel,
    evaluateIndexedSystem,
    validateModel,
    buildAdjacency,
    analyzeTopology,
    generateTopology,
    synthesizeSubjects,
    mulberry32,
    hashSeed
  };

  if (typeof document !== "undefined") init();
