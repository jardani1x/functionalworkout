$(function () {
    
  // =======================
  // State
  // =======================
  let queue = []; // { id, name, work (s), rest (s) }
  let idx = -1; // current item index
  let phase = 'idle'; // 'idle' | 'work' | 'rest'
  let totalSeconds = 0; // current countdown seconds
  let intervalId = null;
  let running = false;

  // Defaults
  let workDefault = 40; // seconds
  let restDefault = 20; // seconds
  const adjustStep = 5; // seconds for +/-

  // Elements
  const $display = $('#timer-display');
  const $phaseBadge = $('#phase-badge');
  const $title = $('#current-title');
  const $builderList = $('#builder-list');
  const $dropZone = $('#drop-zone');

  const $start = $('#start-btn');
  const $pause = $('#pause-btn');
  const $reset = $('#reset-btn');

  // Defaults UI
  const $workDefault = $('#work-default');
  const $restDefault = $('#rest-default');

  // Pane
  const $pane = $('#exercise-pane');
  const $toggle = $('#pane-toggle');
  const $close = $('#close-pane');
  const $accordion = $('#exercise-accordion');
  const $search = $('#exercise-search');

// >>> EXPLAINER UI
const $out  = $('#explain-output');
const $spin = $('#explain-spinner');
const $err  = $('#explain-error');
const $auto = $('#auto-explain');
const $regen= $('#regenerate-explain');
const $model= $('#explainer-model');
const $test = $('#test-explain');

// Probe once and surface any setup issues (HTTPS, adapter, etc.)
(async () => {
  if (window.ExerciseExplainer?.ready) await ExerciseExplainer.ready();
})();

$model.on('change', function(){
  const val = $(this).val();
  if (window.ExerciseExplainer) ExerciseExplainer.setModel(val);
});

let currentExplainName = '';
let explainTimer = null;

function startExplain(name, { force=false } = {}) {
  if (!window.ExerciseExplainer) return;           // no hard WebGPU gate here
  if (!name || /^(Recovery|Ready|Done!)$/.test(name)) return;
  if (!force && name === currentExplainName) return;
  currentExplainName = name;
  clearTimeout(explainTimer);
  $err.addClass('d-none').empty();
  $out.text('');
  $spin.removeClass('d-none');

  // small debounce so the spinner paints
  explainTimer = setTimeout(() => {
    ExerciseExplainer.explain(name, {
      onChunk(tok){ $out.append(tok); },
      onDone(){ $spin.addClass('d-none'); },
      onError(e){ $spin.addClass('d-none'); $err.removeClass('d-none').text(String(e?.message || e)); }
    });
  }, 50);
}

$regen.on('click', function(){ startExplain($('#current-title').text().trim(), { force:true }); });
$test.on('click', function(){ startExplain('Air Squat', { force:true }); });

// Call the explainer on first work phase and each time we return to work
// Insert these two lines in your existing sequence engine:
//  - inside startSequence(), right after setting the first item’s name
//  - inside nextPhaseOrItem(), when switching to a new work phase
// Example:
//   if ($auto.is(':checked')) startExplain(queue[idx].name);
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
  function setPhase(p) {
    phase = p;
    const map = { idle: 'Idle', work: 'Work', rest: 'Recovery' };
    $phaseBadge.text(map[p] || '');
    $phaseBadge.toggleClass('bg-light', p === 'idle');
    $phaseBadge.toggleClass('bg-danger-subtle', p === 'rest');
    $phaseBadge.toggleClass('bg-success-subtle', p === 'work');
  }
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  // =======================
  // Defaults Controls (+/-)
  // =======================
  function syncDefaults() {
    $workDefault.text(formatTime(workDefault));
    $restDefault.text(formatTime(restDefault));
  }
  $('#work-inc').on('click', () => { workDefault = clamp(workDefault + adjustStep, 0, 7200); syncDefaults(); });
  $('#work-dec').on('click', () => { workDefault = clamp(workDefault - adjustStep, 0, 7200); syncDefaults(); });
  $('#rest-inc').on('click', () => { restDefault = clamp(restDefault + adjustStep, 0, 7200); syncDefaults(); });
  $('#rest-dec').on('click', () => { restDefault = clamp(restDefault - adjustStep, 0, 7200); syncDefaults(); });
  syncDefaults();

  // =======================
  // Sequence Engine
  // =======================
  function nextPhaseOrItem() {
    if (idx < 0 || idx >= queue.length) { completeSequence(); return; }
    const cur = queue[idx];

    if (phase === 'work') {
      // Work just finished; go to rest if any
      if (cur.rest > 0) {
        setPhase('rest');
        totalSeconds = cur.rest;
        $title.text('Recovery');
        renderTimer();
        return;
      } else {
        // No rest; advance item
        idx += 1;
      }
    } else if (phase === 'rest') {
      // Rest finished; advance item
      idx += 1;
    }

    if (idx < queue.length) {
      const nxt = queue[idx];
      setPhase('work');
      totalSeconds = nxt.work;
      $title.text(nxt.name);
      renderTimer();
      if ($auto.is(':checked')) startExplain(queue[idx].name);
    } else {
      completeSequence();
    }
  }

  function tick() {
    if (totalSeconds > 0) {
      totalSeconds -= 1;
      renderTimer();
    } else {
      // move along
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
      idx = 0;
      setPhase('work');
      totalSeconds = queue[idx].work;
      $title.text(queue[idx].name);
      renderTimer();
      if ($auto.is(':checked')) startExplain(queue[idx].name);
    }
    intervalId = setInterval(tick, 1000);
  }

  function pauseSequence() {
    if (!running) return;
    running = false;
    clearInterval(intervalId);
    $start.prop('disabled', false);
    $pause.prop('disabled', true);
  }

  function resetSequence() {
    running = false;
    clearInterval(intervalId);
    idx = -1; setPhase('idle'); totalSeconds = 0; renderTimer();
    $title.text('Ready');
    $start.prop('disabled', false);
    $pause.prop('disabled', true);
    $display.removeClass('flash');
  }

  function completeSequence() {
    pauseSequence();
    setPhase('idle');
    $title.text('Done!');
    $display.addClass('flash');
    setTimeout(() => $display.removeClass('flash'), 2500);
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
  }

  function renderBuilder() {
    $builderList.empty();
    if (!queue.length) { $('#empty-tip').show(); } else { $('#empty-tip').hide(); }

    queue.forEach((it, i) => {
      const $li = $(
        `<li class="list-group-item bg-transparent text-light border-secondary builder-item" data-id="${it.id}">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <span class="handle" title="Reorder" aria-hidden="true">↕</span>
              <strong>${escapeHtml(it.name)}</strong>
            </div>
            <div class="d-flex align-items-center gap-3">
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
    queue = queue.filter(x => x.id !== id);
    renderBuilder();
  });
  $builderList.on('click', '.move-up', function () {
    const id = Number($(this).closest('li').data('id'));
    const i = queue.findIndex(x => x.id === id);
    if (i > 0) { [queue[i-1], queue[i]] = [queue[i], queue[i-1]]; renderBuilder(); }
  });
  $builderList.on('click', '.move-down', function () {
    const id = Number($(this).closest('li').data('id'));
    const i = queue.findIndex(x => x.id === id);
    if (i >= 0 && i < queue.length - 1) { [queue[i+1], queue[i]] = [queue[i], queue[i+1]]; renderBuilder(); }
  });

  function adjustItemTime($btn, delta) {
    const $li = $btn.closest('li');
    const id = Number($li.data('id'));
    const kind = $btn.closest('.mini-time-group').data('kind');
    const item = queue.find(x => x.id === id);
    const key = kind === 'work' ? 'work' : 'rest';
    item[key] = clamp(item[key] + delta, 0, 7200);
    renderBuilder();
  }
  $builderList.on('click', '.time-inc', function () { adjustItemTime($(this), +adjustStep); });
  $builderList.on('click', '.time-dec', function () { adjustItemTime($(this), -adjustStep); });

  $('#clear-builder').on('click', function () { queue = []; renderBuilder(); resetSequence(); });

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
  // Exercises Pane + Search
  // =======================
//   const EXERCISES = [
//     { category: 'Chest', items: [
//       'Push-Up', 'Diamond Push-Up', 'Ring Push-Up', 'Hand Release Push-Up',
//       'Barbell Bench Press', 'Dumbbell Bench Press', 'Ring Dip', 'Box Push-Up'
//     ]},
//     { category: 'Legs', items: [
//       'Air Squat', 'Front Squat', 'Back Squat', 'Overhead Squat',
//       'Lunges', 'Walking Lunge', 'Bulgarian Split Squat', 'Pistol Squat',
//       'Box Step-Up', 'Wall Ball Shot'
//     ]},
//     { category: 'Shoulders', items: [
//       'Strict Press', 'Push Press', 'Push Jerk', 'Split Jerk',
//       'Handstand Push-Up', 'Pike Push-Up', 'Lateral Raise', 'Rear Delt Fly',
//       'Dumbbell Snatch', 'Kettlebell Swing (American)', 'Kettlebell Swing (Russian)'
//     ]},
//     { category: 'Back', items: [
//       'Deadlift', 'Sumo Deadlift High Pull', 'Bent-Over Row', 'Good Morning',
//       'Hip Hinge', 'Superman Hold'
//     ]},
//     { category: 'Olympic Weightlifting', items: [
//       'Snatch', 'Power Snatch', 'Hang Snatch', 'Clean', 'Power Clean', 'Hang Clean',
//       'Jerk', 'Clean & Jerk', 'Thruster', 'Bear Complex'
//     ]},
//     { category: 'Gymnastics – Pulling', items: [
//       'Strict Pull-Up', 'Kipping Pull-Up', 'Butterfly Pull-Up', 'Chest-to-Bar Pull-Up',
//       'Ring Row', 'Bar Muscle-Up', 'Ring Muscle-Up', 'Rope Climb', 'Towel Pull-Up'
//     ]},
//     { category: 'Core / Midline', items: [
//       'Sit-Up', 'Toes-to-Bar', 'Knees-to-Elbows', 'GHD Sit-Up', 'Hollow Hold',
//       'Hollow Rock', 'Plank', 'V-Up', 'Russian Twist'
//     ]},
//     { category: 'Monostructural (Cardio)', items: [
//       'Run', 'Row', 'Ski Erg', 'Assault Bike / Echo Bike', 'Double-Unders',
//       'Single-Unders', 'Burpee', 'Burpee Box Jump Over', 'Shuttle Run'
//     ]},
//     { category: 'Kettlebell', items: [
//       'Kettlebell Swing', 'Kettlebell Clean', 'Kettlebell Snatch', 'Turkish Get-Up',
//       'Goblet Squat', 'Kettlebell Deadlift', 'Farmer Carry'
//     ]},
//     { category: 'Dumbbell', items: [
//       'Dumbbell Snatch', 'Devil Press', 'Dumbbell Clean', 'Dumbbell Thruster',
//       'Dumbbell Push Press', 'Dumbbell Lunge', 'Renegade Row', 'Man Maker'
//     ]},
//     { category: 'Strongman / Odd Objects', items: [
//       'Sandbag Clean', 'Sandbag Over Shoulder', 'Sandbag Carry', 'Yoke Carry',
//       'Sled Push', 'Sled Drag', 'Farmer Carry', 'D-Ball Clean'
//     ]},
//     { category: 'Mobility / Accessory', items: [
//       'Band Pull-Apart', 'Face Pull', 'Banded Hip Opener', 'Ankle Dorsiflexion Stretch',
//       'Thoracic Extension', 'Couch Stretch'
//     ]}
//   ];

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

  // Search now filters the loaded EXERCISES
  $search.on('input', function () {
    const q = $(this).val().toLowerCase().trim();
    if (!q) { buildAccordion(EXERCISES); return; }
    const filtered = EXERCISES
      .map(cat => ({ category: cat.category, items: cat.items.filter(it => it.toLowerCase().includes(q)) }))
      .filter(cat => cat.items.length);
    buildAccordion(filtered);
  });

  // =======================
  // Init
  // =======================
  renderTimer();
  setPhase('idle');
  loadExercises('./data/exercises.json');

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
      .map(cat => ({
        category: cat.category,
        items: cat.items.filter(it => it.toLowerCase().includes(q))
      }))
      .filter(cat => cat.items.length);
    buildAccordion(filtered);
  });

  // Pane open/close
  function openPane() { $pane.addClass('open').attr('aria-hidden', 'false'); $toggle.attr('aria-expanded', 'true').hide(); }
  function closePane() { $pane.removeClass('open').attr('aria-hidden', 'true'); $toggle.attr('aria-expanded', 'false').show(); }
  $toggle.on('click', openPane);
  $close.on('click', closePane);
  
  $("main *").on('click', closePane);

  // Keyboard shortcuts (optional): space=start/pause, r=reset, esc=close pane
  $(document).on('keydown', (e) => {
    if ($(e.target).is('input, textarea')) return;
    if (e.key === ' ') { e.preventDefault(); running ? pauseSequence() : startSequence(); }
    if (e.key.toLowerCase() === 'r') { resetSequence(); }
    if (e.key === 'Escape') { closePane(); }
  });

  // Init
  renderTimer();
  setPhase('idle');
  buildAccordion(EXERCISES);
});