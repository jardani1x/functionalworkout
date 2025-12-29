(() => {
  const WORK_SEC = 5;
  const REST_SEC = 5;
  const STATIONS = 26; // 26*(60+45) = 45m30s

  // ===== YouTube search helper (avoids dead direct-video links)
  function youtubeSearchUrl(exerciseName) {
    const q = `${exerciseName} proper form`;
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  }

  // ===== Audio beep (Web Audio API; allowed after user gesture)
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }
  function beep(freq = 880, ms = 120, vol = 0.07) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    setTimeout(() => {
      try { o.stop(); } catch (e) {}
      try { o.disconnect(); g.disconnect(); } catch (e) {}
    }, ms);
  }

  // ===== helpers
  const pad2 = (n) => String(n).padStart(2, "0");
  const mmss = (sec) => pad2(Math.floor(sec / 60)) + ":" + pad2(sec % 60);

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function niceDate() {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function safeGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }

  function safeSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getLibrary() {
    const lib = window.EXERCISE_LIBRARY;
    if (!lib || !lib.pull || !lib.push || !lib.squat || !lib.hinge) {
      // Fail-safe so UI still renders
      return {
        pull: [{ name: "Band Row", equip: "Band", cues: "Squeeze back" }],
        push: [{ name: "Push-Ups", equip: "Bodyweight", cues: "Quality reps" }],
        squat: [{ name: "DB Goblet Squat", equip: "1×10kg", cues: "Full foot" }],
        hinge: [{ name: "DB Romanian Deadlift", equip: "2×10kg", cues: "Hinge" }],
      };
    }
    return lib;
  }

  function modeLabel(mode) {
    if (mode === "upper") return "Upper body";
    if (mode === "lower") return "Lower body";
    return "Full body";
  }

  // ===== Workout mode (persisted)
  const MODE_PREF_KEY = "f45_mode_pref";
  function getModePref() {
    return safeGet(MODE_PREF_KEY) || "full";
  }
  function setModePref(mode) {
    safeSet(MODE_PREF_KEY, mode);
  }

  // Build a plan that alternates category (no pull->pull back-to-back)
  function buildPlan(mode) {
    const lib = getLibrary();

    let categories;
    if (mode === "upper") categories = ["pull", "push"];
    else if (mode === "lower") categories = ["squat", "hinge"];
    else categories = ["squat", "pull", "hinge", "push"];

    // Create per-category pools
    const pools = {};
    categories.forEach((c) => (pools[c] = shuffle(lib[c])));

    const used = new Set();

    function takeFrom(cat) {
      // Prefer unused exercises until pool exhausted; then allow reuse
      for (const item of pools[cat]) {
        if (!used.has(item.name)) {
          used.add(item.name);
          return item;
        }
      }
      pools[cat] = shuffle(lib[cat]);
      return pools[cat][0];
    }

    const plan = [];
    let lastCat = null;

    // randomize starting position to add variety
    let idx = Math.floor(Math.random() * categories.length);

    for (let i = 0; i < STATIONS; i++) {
      // choose category different from last
      let cat = categories[idx % categories.length];
      if (cat === lastCat) cat = categories[(idx + 1) % categories.length];
      if (cat === lastCat && categories.length > 1) {
        const alt = categories.filter((c) => c !== lastCat);
        cat = alt[Math.floor(Math.random() * alt.length)];
      }

      const item = takeFrom(cat);

      plan.push({
        station: i + 1,
        category: cat,
        name: item.name,
        equip: item.equip || "",
        cues: item.cues || "",
        url: youtubeSearchUrl(item.name),
      });

      lastCat = cat;
      idx++;
    }

    // extra safeguard: ensure no adjacent duplicates
    for (let i = 1; i < plan.length; i++) {
      if (plan[i].category === plan[i - 1].category) {
        for (let j = i + 1; j < plan.length; j++) {
          if (plan[j].category !== plan[i - 1].category && plan[j].category !== plan[i].category) {
            const tmp = plan[i];
            plan[i] = plan[j];
            plan[j] = tmp;
            break;
          }
        }
      }
    }

    return plan;
  }

  function getOrCreateDailyPlan(mode, forceNew = false) {
    const key = todayKey();
    const storageKey = `f45_plan_${key}_${mode}`;

    if (!forceNew) {
      const raw = safeGet(storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            const fixed = parsed.map((it, idx) => ({
              station: it.station ?? (idx + 1),
              category: it.category || "pull",
              name: it.name,
              equip: it.equip || "",
              cues: it.cues || "",
              url: (it.url && it.url.includes("youtube.com/results"))
                ? it.url
                : youtubeSearchUrl(it.name || "exercise"),
            }));
            return { key, storageKey, plan: fixed, locked: true, mode };
          }
        } catch (e) {}
      }
    }

    const plan = buildPlan(mode);
    safeSet(storageKey, JSON.stringify(plan));
    return { key, storageKey, plan, locked: true, mode };
  }

  // ===== DOM
  const badgeDate = document.getElementById("badgeDate");
  const badgeMode = document.getElementById("badgeMode");
  const badgeLocked = document.getElementById("badgeLocked");
  const badgeTotal = document.getElementById("badgeTotal");
  const stationsBody = document.getElementById("stationsBody");

  const pillPhase = document.getElementById("pillPhase");
  const timerText = document.getElementById("timerText");
  const timerPhaseText = document.getElementById("timerPhaseText");
  const stationLabel = document.getElementById("stationLabel");
  const currentExerciseLine = document.getElementById("currentExerciseLine");

  const btnStart = document.getElementById("btnStart");
  const btnPause = document.getElementById("btnPause");
  const btnStop = document.getElementById("btnStop");
  const btnReset = document.getElementById("btnReset");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnReroll = document.getElementById("btnReroll");
  const btnToggleCompleted = document.getElementById("btnToggleCompleted");

  const btnModeFull = document.getElementById("btnModeFull");
  const btnModeUpper = document.getElementById("btnModeUpper");
  const btnModeLower = document.getElementById("btnModeLower");

  let showCompleted = false;

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => t.classList.remove("show"), 1600);
  }

  function categoryLabel(cat) {
    const map = { pull: "PULL", push: "PUSH", squat: "SQUAT", hinge: "HINGE" };
    return map[cat] || String(cat).toUpperCase();
  }

  function setModeButtons(mode) {
    const all = [btnModeFull, btnModeUpper, btnModeLower].filter(Boolean);
    all.forEach((b) => b.classList.remove("mode-active"));
    if (mode === "upper") btnModeUpper?.classList.add("mode-active");
    else if (mode === "lower") btnModeLower?.classList.add("mode-active");
    else btnModeFull?.classList.add("mode-active");
  }

  // Render: Exercise row then Recovery row (work -> recovery -> work)
  function renderPlan(info) {
    badgeDate.textContent = niceDate();
    if (badgeMode) badgeMode.textContent = "Mode: " + modeLabel(info.mode);
    badgeLocked.textContent = "Locked: " + info.key;
    badgeTotal.textContent = "Total: " + mmss(STATIONS * (WORK_SEC + REST_SEC));

    stationsBody.innerHTML = "";
    info.plan.forEach((it, idx) => {
      // WORK row
      const trWork = document.createElement("tr");
      trWork.dataset.station = String(idx);
      trWork.dataset.kind = "work";
      trWork.innerHTML = `
        <td class="text-secondary fw-semibold">#${it.station}</td>
        <td>
          <div class="fw-semibold">${it.name}</div>
          <div class="text-secondary small">${categoryLabel(it.category)} • ${it.equip}</div>
        </td>
        <td class="d-none d-md-table-cell">
          <div class="text-secondary small">${it.cues}</div>
        </td>
        <td class="text-end">
          <a class="btn btn-outline-light btn-sm" href="${it.url}" target="_blank" rel="noopener">Watch</a>
        </td>
      `;
      trWork.addEventListener("click", () => jumpToStation(idx, "work"));
      stationsBody.appendChild(trWork);

      // RECOVERY row
      const trRest = document.createElement("tr");
      trRest.className = "row-recovery";
      trRest.dataset.station = String(idx);
      trRest.dataset.kind = "rest";
      trRest.innerHTML = `
        <td class="text-secondary fw-semibold">↳</td>
        <td>
          <div class="fw-semibold">Recovery</div>
          <div class="text-secondary small">${REST_SEC}s • breathe + set up</div>
        </td>
        <td class="d-none d-md-table-cell">
          <div class="text-secondary small">Shake out, sip water, prep DB/band, re-focus.</div>
        </td>
        <td class="text-end">
          <span class="text-secondary small">—</span>
        </td>
      `;
      trRest.addEventListener("click", () => jumpToStation(idx, "rest"));
      stationsBody.appendChild(trRest);
    });
  }

  // function setRowHighlight(stationIndex, kind) {
  //   const rows = stationsBody.querySelectorAll("tr");
  //   rows.forEach((r) => r.classList.remove("row-active"));
  //   if (stationIndex < 0) return;

  //   const target = Array.from(rows).find(
  //     (r) => Number(r.dataset.station) === stationIndex && r.dataset.kind === kind
  //   );
  //   if (target) {
  //     target.classList.add("row-active");
  //     target.scrollIntoView({ block: "center", behavior: "smooth" });
  //     // console.log(target);
  //     // $(".row-active").scrollIntoView({ block: "center", behavior: "smooth" });
  //   }
  // }

    function setRowHighlight(stationIndex, kind) {
    // Only auto-scroll when the active target changes (prevents jitter every second)
    if (!window.__activeRowKey) window.__activeRowKey = "";
    const key = `${stationIndex}:${kind}`;

    const rows = stationsBody.querySelectorAll("tr");
    rows.forEach((r) => r.classList.remove("row-active"));
    if (stationIndex < 0) return;

    const target = Array.from(rows).find(
      (r) => Number(r.dataset.station) === stationIndex && r.dataset.kind === kind
      
    );
    if (target) {
      target.classList.add("row-active");
      // target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function smallerHeader() {
    if ($("*").find(".row-active").length > 0) {
      alert("test");
      $("#header_section").addClass("lower_size");
    }
  }

  smallerHeader();

  function updateRowStates() {
    const rows = stationsBody.querySelectorAll("tr");
    rows.forEach((row) => {
      const s = Number(row.dataset.station);
      const isDone = s < stationIdx; // done only when station fully passed
      row.classList.toggle("row-done", isDone);
      row.classList.toggle("row-hidden", isDone && !showCompleted);
    });
  }

  // ===== Timer state
  let currentMode = getModePref();
  setModeButtons(currentMode);

  let dailyInfo = getOrCreateDailyPlan(currentMode, false);
  let PLAN = dailyInfo.plan;

  let mode = "stopped"; // stopped | running | paused
  let phase = "work";   // work | rest
  let stationIdx = 0;   // station index (work stations only)
  let remaining = WORK_SEC;
  let tickHandle = null;

  const nextExerciseName = () => PLAN[Math.min(stationIdx + 1, STATIONS - 1)]?.name || "—";

  function updateUI() {
    stationLabel.textContent = `Station ${stationIdx + 1}/${STATIONS}`;
    const ex = PLAN[stationIdx];

    if (mode === "stopped") {
      pillPhase.textContent = "READY";
      pillPhase.className = "pill";
      timerText.textContent = "00:00";
      timerPhaseText.textContent = "";
      currentExerciseLine.innerHTML = `Next: <b>${ex.name}</b> · ${WORK_SEC}s work / ${REST_SEC}s recovery`;
      setRowHighlight(-1, "work");
      updateRowStates();
    } else {
      const isWork = phase === "work";
      pillPhase.textContent = isWork ? "WORK" : "RECOVER";
      pillPhase.className = isWork ? "pill pill-work" : "pill pill-rest";
      timerText.textContent = mmss(remaining);
      timerPhaseText.textContent = isWork ? "Go" : "Reset";
      currentExerciseLine.innerHTML = isWork
        ? `Now: <b>${ex.name}</b> · ${ex.equip}`
        : `Recover · Up next: <b>${nextExerciseName()}</b>`;
      setRowHighlight(stationIdx, isWork ? "work" : "rest");
      updateRowStates();
    }

    btnStart.disabled = mode === "running";
    btnPause.disabled = mode === "stopped";
    btnStop.disabled = mode === "stopped";
    btnPause.textContent = mode === "paused" ? "Resume" : "Pause";
  }

  function stopTimer(resetToStart = true) {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
    mode = "stopped";
    phase = "work";
    remaining = WORK_SEC;
    if (resetToStart) stationIdx = 0;
    updateUI();
  }

  function startTimer() {
    ensureAudio();
    if (mode === "running") return;

    if (mode === "stopped") {
      phase = "work";
      remaining = WORK_SEC;
    }
    mode = "running";
    updateUI();

    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(() => {
      if (mode !== "running") return;

      remaining -= 1;

      if (remaining <= 0) {
        // beep at end of BOTH work and recovery
        if (phase === "work") beep(660, 120, 0.075);   // work end -> enter recovery
        else beep(880, 120, 0.075);                    // recovery end -> start next work

        if (phase === "work") {
          phase = "rest";
          remaining = REST_SEC;
        } else {
          stationIdx += 1;
          if (stationIdx >= STATIONS) {
            // finish: double beep
            beep(988, 110, 0.085);
            setTimeout(() => beep(784, 170, 0.085), 140);
            toast("Workout complete ✅");
            stopTimer(true);
            return;
          }
          phase = "work";
          remaining = WORK_SEC;
        }
      }

      updateUI();
    }, 1000);
  }

  function togglePause() {
    ensureAudio();
    if (mode === "stopped") return;
    mode = mode === "running" ? "paused" : "running";
    updateUI();
  }

  function jumpToStation(idx, kind = "work") {
    stationIdx = Math.max(0, Math.min(STATIONS - 1, idx));
    if (kind === "rest") {
      phase = "rest";
      remaining = REST_SEC;
    } else {
      phase = "work";
      remaining = WORK_SEC;
    }
    updateUI();
    toast(`Jumped to station #${stationIdx + 1} (${kind === "rest" ? "recovery" : "work"})`);
  }

  function loadMode(modeToLoad, reroll = false) {
    currentMode = modeToLoad;
    setModePref(currentMode);
    setModeButtons(currentMode);

    dailyInfo = getOrCreateDailyPlan(currentMode, reroll);
    PLAN = dailyInfo.plan;

    renderPlan(dailyInfo);
    stopTimer(true);
    toast(`Loaded: ${modeLabel(currentMode)}${reroll ? " (rerolled)" : ""}`);
  }

  // ===== init + events
  renderPlan(dailyInfo);
  updateRowStates();
  updateUI();

  btnStart.addEventListener("click", startTimer);
  btnPause.addEventListener("click", togglePause);
  btnStop.addEventListener("click", () => stopTimer(true));
  btnReset.addEventListener("click", () => stopTimer(true));
  btnPrev.addEventListener("click", () => jumpToStation(stationIdx - 1, "work"));
  btnNext.addEventListener("click", () => {
    if (phase === "work") {
      jumpToStation(stationIdx, "rest");
    } else {
      jumpToStation(stationIdx + 1, "work");
    }
  });


  btnReroll.addEventListener("click", () => loadMode(currentMode, true));

  btnToggleCompleted?.addEventListener("click", () => {
    showCompleted = !showCompleted;
    btnToggleCompleted.textContent = showCompleted ? "Hide completed" : "Show completed";
    updateRowStates();
  });

  btnModeFull?.addEventListener("click", () => loadMode("full", false));
  btnModeUpper?.addEventListener("click", () => loadMode("upper", false));
  btnModeLower?.addEventListener("click", () => loadMode("lower", false));

  // Resume audio on first user gesture (helps on iOS)
  window.addEventListener("pointerdown", () => ensureAudio(), { once: true });

  $(".timer-display").addClass("hover-effect");
})();