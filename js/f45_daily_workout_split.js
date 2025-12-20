(() => {
  // $("#workout_name").addClass("gradient-text");
  // 60s work, 45s rest, 26 stations => 45m30s
  const WORK_SEC = 60;
  const REST_SEC = 45;
  const STATIONS = 26;

  // YouTube search helper (avoids dead direct-video links)
  function youtubeSearchUrl(exerciseName) {
    // Add "proper form" to reduce junk results
    const q = `${exerciseName} proper form`;
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  }

  // Exercise library (DB/band/pull-up bar/bodyweight only)
  const EXERCISES = [
    // Lower + hinge
    { name: "DB Goblet Squat", cat: "lower", equip: "1×10kg or 1×5kg", cues: "Elbows inside knees, full-foot pressure" },
    { name: "DB Front Squat", cat: "lower", equip: "2×10kg or 2×5kg", cues: "DBs at shoulders, ribs down" },
    { name: "DB Romanian Deadlift", cat: "hinge", equip: "2×10kg", cues: "Hips back, soft knees, lats on" },
    { name: "DB Suitcase Deadlift", cat: "hinge", equip: "2×10kg", cues: "Stand tall, avoid rounding" },
    { name: "Reverse Lunges (DB)", cat: "lower", equip: "2×5kg (or 2×10kg)", cues: "12 total = 6/leg" },
    { name: "Split Squat (DB)", cat: "lower", equip: "2×5kg", cues: "Vertical torso, knee tracks toes" },
    { name: "Banded Good Morning", cat: "hinge", equip: "heavy band", cues: "Band at hips, hinge, squeeze glutes" },
    { name: "Banded Lateral Walks", cat: "lower", equip: "light band", cues: "Small steps, knees out" },

    // Upper push
    { name: "Push-Ups", cat: "push", equip: "bodyweight", cues: "Ribs down, full-body tension" },
    { name: "DB Floor Press", cat: "push", equip: "2×10kg or 2×5kg", cues: "Elbows ~45°, pause on floor" },
    { name: "DB Push Press", cat: "push", equip: "2×5kg or 2×10kg", cues: "Dip-drive, no over-arch" },
    { name: "DB Thrusters", cat: "power", equip: "2×5kg (or 2×10kg)", cues: "Squat → drive overhead, smooth cycle" },
    { name: "Pike Push-Ups", cat: "push", equip: "bodyweight", cues: "Hips high, head between hands" },

    // Upper pull + band
    { name: "DB Bent-Over Rows", cat: "pull", equip: "2×10kg", cues: "Flat back, pull to pockets" },
    { name: "Single-Arm DB Row", cat: "pull", equip: "1×10kg", cues: "Brace, pause at top" },
    { name: "Banded Rows", cat: "pull", equip: "heavy band", cues: "Squeeze shoulder blades, control return" },
    { name: "Band Face Pulls", cat: "pull", equip: "light band", cues: "Elbows high, pull to eyebrows" },
    { name: "Band Pull-Aparts", cat: "pull", equip: "light band", cues: "Straight arms, squeeze mid-back" },

    // Pull-up bar
    { name: "Pull-Ups / Chin-Ups", cat: "pullup", equip: "pull-up bar", cues: "Full hang, strict if possible" },
    { name: "Negative Pull-Ups", cat: "pullup", equip: "pull-up bar", cues: "3–5s lowering" },
    { name: "Banded Assisted Pull-Ups", cat: "pullup", equip: "band + bar", cues: "Band on bar, knee/foot in band" },

    // Metcon + core
    { name: "Mountain Climbers", cat: "metcon", equip: "bodyweight", cues: "Strong plank, hips stable" },
    { name: "Burpee (no push-up)", cat: "metcon", equip: "bodyweight", cues: "Step down/up if needed" },
    { name: "High Knees (in place)", cat: "metcon", equip: "bodyweight", cues: "Tall posture, quick feet" },
    { name: "Skater Hops", cat: "metcon", equip: "bodyweight", cues: "Soft landings, lateral power" },
    { name: "Plank Shoulder Taps", cat: "core", equip: "bodyweight", cues: "Minimize hip sway" },
    { name: "Hollow Hold", cat: "core", equip: "bodyweight", cues: "Low back down; shorten lever if needed" },
    { name: "Side Plank", cat: "core", equip: "bodyweight", cues: "Long line; hips high" },
    { name: "Dead Bug", cat: "core", equip: "bodyweight", cues: "Slow; exhale, ribs down" },
    { name: "Glute Bridge March", cat: "core", equip: "bodyweight", cues: "Hips high, alternate feet" },

    // Power
    { name: "Single-Arm DB Snatch", cat: "power", equip: "1×10kg (or 1×5kg)", cues: "Hip drive, punch to lockout" },
    { name: "DB Hang Clean (two DB)", cat: "power", equip: "2×10kg or 2×5kg", cues: "Jump-shrug, fast elbows" },
  ];

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

  function pick(cat, n, used) {
    const pool = EXERCISES.filter((x) => x.cat === cat && !used.has(x.name));
    const s = shuffle(pool).slice(0, n);
    s.forEach((x) => used.add(x.name));
    return s;
  }

  function buildPlan() {
    const used = new Set();
    const lower = pick("lower", 6, used);
    const hinge = pick("hinge", 4, used);
    const pull = pick("pull", 5, used);
    const push = pick("push", 4, used);
    const pullup = pick("pullup", 3, used);
    const power = pick("power", 2, used);
    const metcon = pick("metcon", 1, used);
    const core = pick("core", 1, used);

    let plan = [].concat(lower, hinge, pull, push, pullup, power, metcon, core);

    while (plan.length < STATIONS) {
      const remaining = EXERCISES.filter((x) => !used.has(x.name));
      if (!remaining.length) break;
      const p = shuffle(remaining)[0];
      used.add(p.name);
      plan.push(p);
    }

    plan = shuffle(plan).slice(0, STATIONS);
    return plan.map((x, i) => ({
      station: i + 1,
      name: x.name,
      equip: x.equip,
      cues: x.cues,
      // Store as a search URL so it never goes "unavailable"
      url: youtubeSearchUrl(x.name),
    }));
  }

  function getOrCreateDailyPlan(forceNew = false) {
    const key = todayKey();
    const storageKey = "f45_plan_" + key;

    if (!forceNew) {
      const raw = safeGet(storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            // Ensure old stored plans also get search URLs
            const fixed = parsed.map((it) => ({
              ...it,
              url: it.url && it.url.includes("youtube.com/results")
                ? it.url
                : youtubeSearchUrl(it.name || "exercise"),
            }));
            return { key, storageKey, plan: fixed, locked: true };
          }
        } catch (e) {}
      }
    }

    const plan = buildPlan();
    safeSet(storageKey, JSON.stringify(plan));
    return { key, storageKey, plan, locked: true };
  }

  // ===== DOM
  const badgeDate = document.getElementById("badgeDate");
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

  const scrollBox = document.querySelector(".stations-scroll");
  const btnToggleCompleted = document.getElementById("btnToggleCompleted");
  let showCompleted = false;

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => t.classList.remove("show"), 1600);
  }

  function renderPlan(info) {
    badgeDate.textContent = niceDate();
    badgeLocked.textContent = "Locked: " + info.key;
    badgeTotal.textContent = "Total: " + mmss(STATIONS * (WORK_SEC + REST_SEC));

    stationsBody.innerHTML = "";
    info.plan.forEach((it, idx) => {
      const tr = document.createElement("tr");
      tr.dataset.idx = String(idx);
      tr.innerHTML = `
        <td class="text-secondary fw-semibold">#${it.station}</td>
        <td>
          <div id="workout_name" class="fw-semibold">${it.name}</div>
          <div class="text-secondary small">${it.equip}</div>
        </td>
        <td class="d-none d-md-table-cell">
          <div class="text-secondary small" style="color: #f0eee9 !important;">${it.cues}</div>
        </td>
        <td class="text-end">
          <a class="btn btn-outline-light btn-sm" href="${it.url}" target="_blank" rel="noopener">Watch</a>
        </td>
      `;
      tr.addEventListener("click", () => jumpToStation(idx));
      stationsBody.appendChild(tr);
    });
  }
  
  
  function setRowHighlight(stationIndex) {
    const rows = stationsBody.querySelectorAll("tr");
    rows.forEach(r => r.classList.remove("row-active"));

    if (stationIndex >= 0 && stationIndex < rows.length) {
      const row = rows[stationIndex];
      row.classList.add("row-active");

      // Scroll the table box to keep the active row in view
      row.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function updateRowStates() {
  const rows = stationsBody.querySelectorAll("tr");
  rows.forEach((row, idx) => {
      const isDone = idx < stationIdx;
      row.classList.toggle("row-done", isDone);
      row.classList.toggle("row-hidden", isDone && !showCompleted);
    });
  }
  

  // ===== Timer state
  let dailyInfo = getOrCreateDailyPlan(false);
  let PLAN = dailyInfo.plan;

  let mode = "stopped"; // stopped | running | paused
  let phase = "work"; // work | rest
  let stationIdx = 0;
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
      currentExerciseLine.innerHTML = `Next: <b>${ex.name}</b> · ${WORK_SEC}s work / ${REST_SEC}s rest`;
      setRowHighlight(-1);
      updateRowStates();

    } else {
      const isWork = phase === "work";
      pillPhase.textContent = isWork ? "WORK" : "REST";
      pillPhase.className = isWork ? "pill pill-work" : "pill pill-rest";
      timerText.textContent = mmss(remaining);
      timerPhaseText.textContent = isWork ? "Go" : "Breathe";
      currentExerciseLine.innerHTML = isWork
        ? `Now: <b>${ex.name}</b> · ${ex.equip}`
        : `Rest · Up next: <b>${nextExerciseName()}</b>`;
      setRowHighlight(stationIdx);
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
        if (phase === "work") {
          phase = "rest";
          remaining = REST_SEC;
        } else {
          stationIdx += 1;
          if (stationIdx >= STATIONS) {
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
    if (mode === "stopped") return;
    mode = mode === "running" ? "paused" : "running";
    updateUI();
  }

  function jumpToStation(idx) {
    stationIdx = Math.max(0, Math.min(STATIONS - 1, idx));
    phase = "work";
    remaining = WORK_SEC;
    updateUI();
    toast(`Jumped to station #${stationIdx + 1}`);
  }

  // ===== init + events
  renderPlan(dailyInfo);
  updateRowStates();
  updateUI();

  btnStart.addEventListener("click", startTimer);
  btnPause.addEventListener("click", togglePause);
  btnStop.addEventListener("click", () => stopTimer(true));
  btnReset.addEventListener("click", () => stopTimer(true));
  btnPrev.addEventListener("click", () => jumpToStation(stationIdx - 1));
  btnNext.addEventListener("click", () => jumpToStation(stationIdx + 1));
  btnToggleCompleted?.addEventListener("click", () => {
    showCompleted = !showCompleted;
    btnToggleCompleted.textContent = showCompleted ? "Hide completed" : "Show completed";
    updateRowStates();
  });


  btnReroll.addEventListener("click", () => {
    dailyInfo = getOrCreateDailyPlan(true);
    PLAN = dailyInfo.plan;
    renderPlan(dailyInfo);
    stopTimer(true);
    toast("New plan locked for today 🎲");
  });
})();

