/* assets/js/llm-web.js — v3.2 */
(function (global) {
  const state = { engine: null, model: 'Phi-3-mini-4k-instruct-q4f16_1-MLC' };
  const ui = { statusEl: null, errEl: null, outEl: null, spinEl: null, barEl: null, barText: null };

  function $(id){ return document.getElementById(id); }
  function setStatus(text){ ui.statusEl ||= $('explainer-status'); if(ui.statusEl) ui.statusEl.textContent = text; }
  function showError(msg){ ui.errEl ||= $('explain-error'); if(ui.errEl){ ui.errEl.classList.remove('d-none'); ui.errEl.textContent = msg; } console.error('[Explainer]', msg); }
  function hideError(){ ui.errEl ||= $('explain-error'); if(ui.errEl){ ui.errEl.classList.add('d-none'); ui.errEl.textContent = ''; } }
  function setProgress(pct, text){
    ui.barEl ||= $('model-progress'); ui.barText ||= $('model-progress-text');
    if(ui.barEl){ ui.barEl.style.width = Math.max(0, Math.min(100, pct||0)) + '%'; }
    if(ui.barText){ ui.barText.textContent = text || ''; }
  }

  async function checkWebGPU() {
    const secure = (global.isSecureContext || location.hostname === 'localhost');
    if (!secure) return { ok:false, reason:'insecure_context', hint:'Serve over HTTPS or localhost.' };
    if (!navigator.gpu) return { ok:false, reason:'no_navigator_gpu', hint:'Browser disabled WebGPU or unsupported build.' };
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return { ok:false, reason:'no_adapter', hint:'GPU/driver blocked. Check chrome://gpu and drivers.' };
      return { ok:true, reason:'ok' };
    } catch (e) {
      return { ok:false, reason:'error', hint:e?.message || 'requestAdapter failed' };
    }
  }

  function explainProbe(p){
    switch(p.reason){
      case 'insecure_context': return 'WebGPU requires a secure context. Use HTTPS (or http://localhost for dev).';
      case 'no_navigator_gpu': return 'WebGPU not exposed. Update Chrome/Edge and enable hardware acceleration.';
      case 'no_adapter': return 'No GPU adapter available. Check chrome://gpu (WebGPU should be Hardware accelerated) and update drivers.';
      default: return 'WebGPU unavailable: ' + (p.hint || 'unknown reason');
    }
  }

  async function ensureEngine(){
    const probe = await checkWebGPU();
    if (!probe.ok){ setStatus('unavailable'); showError(explainProbe(probe)); throw new Error(explainProbe(probe)); }
    if (state.engine) return state.engine;

    setStatus('loading model…'); setProgress(0, 'Preparing…');
    // Progress callback name may vary across versions: try both
    const progressCb = (report) => {
      try {
        const pct = Math.round((report?.progress || 0) * 100);
        const text = report?.text || 'Loading…';
        setProgress(pct, text);
      } catch (_) {}
    };

    // global webllm from CDN
    state.engine = await webllm.CreateMLCEngine({
      model: state.model,
      logLevel: 'ERROR',
      initProgressCallback: progressCb,
      progressCallback: progressCb
    });

    setStatus('warming up…'); setProgress(100, 'Loaded. First response may take a few seconds.');
    return state.engine;
  }

  function buildPrompt(name){
    return `You are a CrossFit Level 2 coach. Explain how to perform "${name}".\n`+
           `Sections:\n• How to perform (clear cues)\n• Standards & range of motion\n• Scaling options\n• Common faults\n• Safety notes\nLimit to ~120–180 words.`;
  }

  async function explain(name, { onStart, onChunk, onDone, onError } = {}){
    try {
      hideError();
      const engine = await ensureEngine();
      const prompt = buildPrompt(name);
      onStart && onStart('generating…');

      let gotAnyToken = false;
      const noTokenTimer = setTimeout(() => {
        if (!gotAnyToken) setProgress(100, 'Generating… (if stuck, check Network tab for model shards)');
      }, 8000);

      const stream = await engine.chat.completions.create({
        messages: [
          { role: 'system', content:'You are a concise, practical CrossFit coach.' },
          { role: 'user', content: prompt }
        ], temperature: 0.2, stream: true
      });
      for await (const chunk of stream){
        const delta = chunk?.choices?.[0]?.delta?.content || '';
        if (delta) { gotAnyToken = true; onChunk && onChunk(delta); }
      }
      clearTimeout(noTokenTimer);
      onDone && onDone();
    } catch (err){
      showError(err?.message || String(err));
      setStatus('unavailable');
      onError && onError(err);
    }
  }

  function setModel(name){ if(state.model!==name){ state.model = name; state.engine = null; setStatus('model switched'); setProgress(0, 'Model switched — will reload on next request'); } }

  async function ready(){
    const probe = await checkWebGPU();
    if (!probe.ok){ setStatus('unavailable'); showError(explainProbe(probe)); return false; }
    setStatus('on-device'); return true;
  }

  global.ExerciseExplainer = { explain, setModel, ready };
})(window);