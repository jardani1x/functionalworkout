$(function () {

  // =======================
  // State
  // =======================
  // queue item: { id, name, work (s), rest (s between exercises) }
  let queue = [];
  let idx = -1;           // current exercise index within a round
  let roundIdx = 0;       // current round index (0-based)
  let phase = 'idle';     // 'idle' | 'work' | 'rest' | 'setrest'
  let totalSeconds = 0;   // countdown seconds
  let intervalId = null;
  let running = false;

  // GLOBAL sets (apply to the whole selected exercise sequence)
  let globalSets = 1;       // number of rounds (sets) for the whole sequence
  let globalSetRest = 15;   // recovery between each round (in seconds)

  // Defaults for new exercises
  let workDefault = 40;     // seconds
  let restDefault = 20;     // seconds (between exercises)
  const adjustStep = 5;     // +/- seconds for controls

  // Elements
  const $display     = $('#timer-display');
  const $phaseBadge  = $('#phase-badge');        // shows NEXT item (or a done/quote)
  const $title       = $('#current-title');
  const $builderList = $('#builder-list');
  const $dropZone    = $('#drop-zone');

  const $start = $('#start-btn');
  const $pause = $('#pause-btn');
  const $reset = $('#reset-btn');

  // Defaults UI
  const $workDefault = $('#work-default');
  const $restDefault = $('#rest-default');
  // Global Sets UI (optional if present in HTML)
  const $setsDefault    = $('#sets-default');     // text span to show sets count
  const $setRestDisplay = $('#setrest-default');  // text span to show set-rest time

  // Pane (exercise picker)
  const $pane      = $('#exercise-pane');
  const $toggle    = $('#pane-toggle');
  const $close     = $('#close-pane');
  const $accordion = $('#exercise-accordion');
  const $search    = $('#exercise-search');

  // >>> EXPLAINER UI (unchanged)
  const $out  = $('#explain-output');
  const $spin = $('#explain-spinner');
  const $err  = $('#explain-error');
  const $auto = $('#auto-explain');
  const $regen= $('#regenerate-explain');
  const $model= $('#explainer-model');
  const $test = $('#test-explain');

  (async () => {
    if (window.ExerciseExplainer?.ready) await ExerciseExplainer.ready();
  })();

  $model.on('change', function(){
    const val = $(this).val();
    if (window.ExerciseExplainer) ExerciseExplainer.setModel(val);
  });

  let currentExplainName = '';
  let explainedOnce = new Set(); // only explain each exercise once (first round)
  let explainTimer = null;

  function startExplain(name, { force=false } = {}) {
    if (!window.ExerciseExplainer) return;
    if (!name || /^(Recovery|Ready|Done!)$/.test(name)) return;
    if (!force && name === currentExplainName) return;
    currentExplainName = name;
    clearTimeout(explainTimer);
    $err.addClass('d-none').empty();
    $out.text('');
    $spin.removeClass('d-none');

    explainTimer = setTimeout(() => {
      ExerciseExplainer.explain(name, {
        onChunk(tok){ $out.append(tok); },
        onDone(){ $spin.addClass('d-none'); },
        onError(e){ $spin.addClass('d-none'); $err.removeClass('d-none').text(String(e?.message || e)); }
      });
    }, 50);
  }

  $regen.on('click', function(){ startExplain($('#current-title').text().trim(), { force:true }); });
  $test.on('click',  function(){ startExplain('Air Squat', { force:true }); });

  // =======================
  // Utilities
  // =======================
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  function renderTimer() { $display.text(formatTime(totalSeconds)); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  // ===== Audio Beeps (3-2-1) =====
  let audioCtx = null;
  function ensureAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* ignore */ }
    return audioCtx;
  }
  // Simple short sine beep, different pitch for 3/2/1
  function beep(n) {
    try {
      const ctx = ensureAudio();
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const freq = (n === 3) ? 880 : (n === 2) ? 660 : 520; // Hz
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      o.stop(now + 0.14);
    } catch (e) { /* ignore audio errors */ }
  }
  // try to unlock audio on first user gesture
  ['click','keydown','touchstart'].forEach(evt => {
    window.addEventListener(evt, () => { try { ensureAudio(); } catch(_){} }, { once: true, passive: true });
  });

  // ===== Badge content (Next workout or motivational) =====
  const DONE_OR_QUOTES = [
    'Done', 'Finished', 'All set',
    '“Great job — session complete.”',
    '“No next workout — time to recover.”',
    '“Stronger every day.”'
  ];
  const pickDoneOrQuote = () => DONE_OR_QUOTES[Math.floor(Math.random() * DONE_OR_QUOTES.length)];

  function nextLabelFor(round, exIdx) {
    if (!queue.length) return null;
    if (round >= globalSets) return null;
    if (exIdx < queue.length) {
      const it = queue[exIdx];
      return `${it.name} (Round ${round + 1}/${globalSets})`;
    }
    // move to first item of next round
    if (round + 1 < globalSets) {
      const it = queue[0];
      return `${it.name} (Round ${round + 2}/${globalSets})`;
    }
    return null;
  }

  function computeNextWorkoutLabel() {
    if (!queue.length) return null;

    if (phase === 'idle') {
      return nextLabelFor(0, 0);
    }

    if (phase === 'work') {
      // if more exercises in this round, next is next exercise of same round
      if (idx + 1 < queue.length) {
        return nextLabelFor(roundIdx, idx + 1);
      }
      // else next is first exercise of next round
      return nextLabelFor(roundIdx + 1, 0);
    }

    if (phase === 'rest') {
      // just finished rest between exercises, next is the next exercise
      return nextLabelFor(roundIdx, idx + 1);
    }

    if (phase === 'setrest') {
      // between rounds, next is first exercise of next round
      return nextLabelFor(roundIdx + 1, 0);
    }

    return null;
  }

  function renderPhaseBadge() {
    const label = computeNextWorkoutLabel();
    $phaseBadge.text(label ? label : pickDoneOrQuote());
  }

  // Keep phase-based coloring; text shows NEXT workout
  function setPhase(p) {
    phase = p;
    $phaseBadge
      .toggleClass('bg-light',           p === 'idle')
      .toggleClass('bg-success-subtle',  p === 'work')
      .toggleClass('bg-danger-subtle',   p === 'rest')     // between exercises
      .toggleClass('bg-warning-subtle',  p === 'setrest'); // between rounds
    renderPhaseBadge();
  }

  // =======================
  // Defaults Controls (+/-)
  // =======================
  function syncDefaults() {
    $workDefault.text(formatTime(workDefault));
    $restDefault.text(formatTime(restDefault));
    if ($setsDefault.length)     $setsDefault.text(String(globalSets));
    if ($setRestDisplay.length)  $setRestDisplay.text(formatTime(globalSetRest));
  }
  $('#work-inc').on('click', () => { workDefault = clamp(workDefault + adjustStep, 0, 7200); syncDefaults(); });
  $('#work-dec').on('click', () => { workDefault = clamp(workDefault - adjustStep, 0, 7200); syncDefaults(); });
  $('#rest-inc').on('click', () => { restDefault = clamp(restDefault + adjustStep, 0, 7200); syncDefaults(); });
  $('#rest-dec').on('click', () => { restDefault = clamp(restDefault - adjustStep, 0, 7200); syncDefaults(); });
  // Global Sets +/- (if present in DOM)
  $('#sets-inc').on('click',    () => { globalSets = clamp(globalSets + 1, 1, 99); syncDefaults(); renderPhaseBadge(); });
  $('#sets-dec').on('click',    () => { globalSets = clamp(globalSets - 1, 1, 99); syncDefaults(); renderPhaseBadge(); });
  $('#setrest-inc').on('click', () => { globalSetRest = clamp(globalSetRest + adjustStep, 0, 7200); syncDefaults(); });
  $('#setrest-dec').on('click', () => { globalSetRest = clamp(globalSetRest - adjustStep, 0, 7200); syncDefaults(); });
  syncDefaults();

  // =======================
  // Sequence Engine (GLOBAL sets/rounds)
  // =======================
  function startWorkForCurrent() {
    const cur = queue[idx];
    setPhase('work');
    totalSeconds = cur.work;
    $title.text(`${cur.name} — Round ${roundIdx + 1}/${globalSets}`);
    renderTimer();
    // Explain each exercise only once (on its first appearance)
    if ($auto.is(':checked') && !explainedOnce.has(cur.name)) {
      explainedOnce.add(cur.name);
      startExplain(cur.name);
    }
  }

  function nextPhaseOrItem() {
    if (idx < 0 || (roundIdx >= globalSets)) { completeSequence(); return; }
    const cur = queue[idx];

    if (phase === 'work') {
      // Finished a work segment
      if (idx + 1 < queue.length) {
        // there is a next exercise in this round
        if (cur.rest > 0) {
          setPhase('rest');
          totalSeconds = cur.rest;
          $title.text('Recovery');
          renderTimer();
          return;
        } else {
          idx += 1;
          startWorkForCurrent();
          return;
        }
      } else {
        // last exercise in the round
        if (roundIdx + 1 < globalSets) {
          // more rounds remain
          if (globalSetRest > 0) {
            setPhase('setrest');
            totalSeconds = globalSetRest;
            $title.text('Recovery (between sets)');
            renderTimer();
            return;
          } else {
            // no round rest; advance to next round
            roundIdx += 1;
            idx = 0;
            startWorkForCurrent();
            return;
          }
        } else {
          // that was the last exercise of the last round
          completeSequence();
          return;
        }
      }
    }

    if (phase === 'rest') {
      // between exercises -> advance to next exercise in same round
      idx += 1;
      startWorkForCurrent();
      return;
    }

    if (phase === 'setrest') {
      // between rounds -> next round starts at first exercise
      roundIdx += 1;
      idx = 0;
      startWorkForCurrent();
      return;
    }
  }

  function tick() {
    if (totalSeconds > 0) {
      // Beep on 3-2-1
      if (totalSeconds === 3 || totalSeconds === 2 || totalSeconds === 1) {
        beep(totalSeconds);
      }
      totalSeconds -= 1;
      renderTimer();
    } else {
      nextPhaseOrItem();
      if (phase === 'idle') return; // finished
    }
  }

  function startSequence() {
    if (running) return;
    if (!queue.length) {
      // nudge UX
      $dropZone.addClass('drag-over');
      setTimeout(() => $dropZone.removeClass('drag-over'), 700);
      return;
    }
    running = true;
    $start.prop('disabled', true);
    $pause.prop('disabled', false);

    if (phase === 'idle' || idx === -1) {
      roundIdx = 0;
      idx = 0;
      explainedOnce.clear();
      startWorkForCurrent();
    }
    intervalId = setInterval(tick, 1000);
  }

  function pauseSequence() {
    if (!running) return;
    running = false;
    clearInterval(intervalId);
    $start.prop('disabled', false);
    $pause.prop('disabled', true);
    renderPhaseBadge();
  }

  function resetSequence() {
    running = false;
    clearInterval(intervalId);
    idx = -1;
    roundIdx = 0;
    setPhase('idle');
    totalSeconds = 0;
    renderTimer();
    $title.text('Ready');
    $start.prop('disabled', false);
    $pause.prop('disabled', true);
    $display.removeClass('flash');
    explainedOnce.clear();
    renderPhaseBadge();
  }

  function completeSequence() {
    pauseSequence();
    setPhase('idle');
    $title.text('Done!');
    $display.addClass('flash');
    setTimeout(() => $display.removeClass('flash'), 2500);
    renderPhaseBadge(); // will show Done/Finished/Quote
  }

  $start.on('click', startSequence);
  $pause.on('click', pauseSequence);
  $reset.on('click', resetSequence);

  // =======================
  // Builder (drag & drop)
  // =======================
  let idCounter = 1;

  function addExercise(name, w = workDefault, r = restDefault) {
    queue.push({ id: idCounter++, name, work: w, rest: r });
    renderBuilder();
    renderPhaseBadge();
  }

  function renderBuilder() {
    $builderList.empty();
    if (!queue.length) { $('#empty-tip').show(); } else { $('#empty-tip').hide(); }

    queue.forEach((it) => {
      const $li = $(
        `<li class="list-group-item bg-transparent text-light border-secondary builder-item" data-id="${it.id}">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <span class="handle" title="Reorder" aria-hidden="true">↕</span>
              <strong>${escapeHtml(it.name)}</strong>
            </div>
            <div class="d-flex align-items-center gap-3 flex-wrap">
              <div class="mini-time-group" data-kind="work">
                <span class="small text-muted me-1">Work</span>
                <div class="btn-group btn-group-sm" role="group">
                  <button class="btn btn-outline-light time-inc" type="button">+</button>
                  <span class="time-show">${formatTime(it.work)}</span>
                  <button class="btn btn-outline-light time-dec" type="button">−</button>
                </div>
              </div>
              <div class="mini-time-group" data-kind="rest">
                <span class="small text-muted me-1">Recovery</span>
                <div class="btn-group btn-group-sm" role="group">
                  <button class="btn btn-outline-light time-inc" type="button">+</button>
                  <span class="time-show">${formatTime(it.rest)}</span>
                  <button class="btn btn-outline-light time-dec" type="button">−</button>
                </div>
              </div>
              <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-secondary move-up" type="button">↑</button>
                <button class="btn btn-outline-secondary move-down" type="button">↓</button>
                <button class="btn btn-outline-danger remove" type="button">×</button>
              </div>
            </div>
          </div>
        </li>`);
      $builderList.append($li);
    });
  }

  // Per-item controls
  $builderList.on('click', '.remove', function () {
    const id = Number($(this).closest('li').data('id'));
    const i = queue.findIndex(x => x.id === id);
    if (i !== -1) {
      queue.splice(i, 1);
      if (idx >= queue.length) { idx = queue.length - 1; }
      renderBuilder();
      renderPhaseBadge();
    }
  });

  $builderList.on('click', '.move-up', function () {
    const id = Number($(this).closest('li').data('id'));
    const i = queue.findIndex(x => x.id === id);
    if (i > 0) {
      [queue[i-1], queue[i]] = [queue[i], queue[i-1]];
      renderBuilder();
      renderPhaseBadge();
    }
  });

  $builderList.on('click', '.move-down', function () {
    const id = Number($(this).closest('li').data('id'));
    const i = queue.findIndex(x => x.id === id);
    if (i >= 0 && i < queue.length - 1) {
      [queue[i+1], queue[i]] = [queue[i], queue[i+1]];
      renderBuilder();
      renderPhaseBadge();
    }
  });

  function adjustItemTime($btn, delta) {
    const $li = $btn.closest('li');
    const id = Number($li.data('id'));
    const kind = $btn.closest('.mini-time-group').data('kind');
    const item = queue.find(x => x.id === id);
    if (!item) return;
    const key = (kind === 'work') ? 'work' : 'rest';
    item[key] = clamp(item[key] + delta, 0, 7200);
    renderBuilder();
    renderPhaseBadge();
  }
  $builderList.on('click', '.time-inc', function () { adjustItemTime($(this), +adjustStep); });
  $builderList.on('click', '.time-dec', function () { adjustItemTime($(this), -adjustStep); });

  $('#clear-builder').on('click', function () {
    queue = [];
    renderBuilder();
    resetSequence();   // also re-renders badge
  });

  // Drop support
  function handleDrop(e) {
    e.preventDefault();
    $dropZone.removeClass('drag-over');
    const dt = e.originalEvent.dataTransfer;
    if (!dt) return;
    const name = dt.getData('text/plain');
    if (name) addExercise(name.trim());
  }
  $dropZone.on('dragover', (e) => { e.preventDefault(); $dropZone.addClass('drag-over'); });
  $dropZone.on('dragleave', () => $dropZone.removeClass('drag-over'));
  $dropZone.on('drop', handleDrop);
  $builderList.on('dragover', (e) => { e.preventDefault(); });
  $builderList.on('drop', handleDrop);

  // =======================
  // Exercises Loader (External JSON)
  // =======================
  let EXERCISES = [];

  function normalizeExercises(data) {
    if (Array.isArray(data)) return data;                 // top-level array
    if (data && Array.isArray(data.categories)) return data.categories; // { categories: [...] }
    throw new Error('Invalid exercises schema.');
  }

  function loadExercises(url) {
    return $.ajax({ url, dataType: 'json', cache: false })
      .then((res) => {
        EXERCISES = normalizeExercises(res);
        buildAccordion(EXERCISES);
      })
      .catch((err) => {
        console.error('Failed to load exercises:', err);
        const $alert = $('<div class="alert alert-warning alert-dismissible fade show" role="alert">\
          Could not load <code>' + url + '</code>. Using a small fallback list.\
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>\
        </div>');
        $('.pane-body').prepend($alert);
        EXERCISES = [ { category: 'Sample', items: ['Push-Up', 'Air Squat'] } ];
        buildAccordion(EXERCISES);
      });
  }

  function buildAccordion(data) {
    $accordion.empty();
    data.forEach((cat, i) => {
      const id = `acc-${i}`;
      const items = cat.items.map(it =>
        `<li class="list-group-item border-secondary py-1 exercise-item" draggable="true" data-name="${escapeHtml(it)}">${escapeHtml(it)}</li>`
      ).join('');
      const html = `
        <div class="accordion-item bg-transparent text-light border-secondary">
          <h2 class="accordion-header" id="${id}-h">
            <button class="accordion-button collapsed bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#${id}-c" aria-expanded="false" aria-controls="${id}-c">
              ${escapeHtml(cat.category)}
            </button>
          </h2>
          <div id="${id}-c" class="accordion-collapse collapse" aria-labelledby="${id}-h" data-bs-parent="#exercise-accordion">
            <div class="accordion-body p-0">
              <ul class="list-group list-group-flush">${items}</ul>
            </div>
          </div>
        </div>`;
      $accordion.append(html);
    });
  }

  // DnD from pane
  $accordion.on('dragstart', 'li.exercise-item', function (e) {
    const name = $(this).data('name');
    e.originalEvent.dataTransfer.setData('text/plain', name);
  });
  // Tap-to-add for mobile
  $accordion.on('click', 'li.exercise-item', function () {
    addExercise($(this).data('name'));
  });

  // Search
  $search.on('input', function () {
    const q = $(this).val().toLowerCase().trim();
    if (!q) { buildAccordion(EXERCISES); return; }
    const filtered = EXERCISES
      .map(cat => ({ category: cat.category, items: cat.items.filter(it => it.toLowerCase().includes(q)) }))
      .filter(cat => cat.items.length);
    buildAccordion(filtered);
  });

  // Pane open/close
  function openPane()  { $pane.addClass('open').attr('aria-hidden', 'false'); $toggle.attr('aria-expanded', 'true').hide(); }
  function closePane() { $pane.removeClass('open').attr('aria-hidden', 'true'); $toggle.attr('aria-expanded', 'false').show(); }
  $toggle.on('click', openPane);
  $close.on('click', closePane);
  $("main *").on('click', closePane);

  // Keyboard shortcuts
  $(document).on('keydown', (e) => {
    if ($(e.target).is('input, textarea')) return;
    if (e.key === ' ') { e.preventDefault(); running ? pauseSequence() : startSequence(); }
    if (e.key.toLowerCase() === 'r') { resetSequence(); }
    if (e.key === 'Escape') { closePane(); }
  });

  // =======================
  // Init
  // =======================
  renderTimer();
  setPhase('idle');      // also calls renderPhaseBadge()
  renderPhaseBadge();    // show first upcoming item or a done/quote
  loadExercises('./data/exercises.json');
});
