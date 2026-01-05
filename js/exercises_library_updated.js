// exercises_library.js
// F45-style station library grouped into 4 movement patterns:
//   pull, push, squat, hinge
// Each entry: { name, equip, cues }
//
// Equipment supported:
// - 2×5kg DB, 2×10kg DB
// - Pull-up bar
// - Light + heavy resistance bands
//
// Video links are created via YouTube search in the app JS to avoid dead links.

window.EXERCISE_LIBRARY = {
  pull: [
    { name: "Pull-Ups / Chin-Ups", equip: "Pull-up bar (band assist optional)", cues: "Full hang; ribs down; controlled reps" },
    { name: "Negative Pull-Ups", equip: "Pull-up bar", cues: "Step/jump to top; 3–5s lowering" },
    { name: "Banded Assisted Pull-Ups", equip: "Band + pull-up bar", cues: "Band on bar; knee/foot in band; full ROM" },

    { name: "DB Bent-Over Row", equip: "2×10kg", cues: "Flat back; pull to pockets; pause 1s" },
    { name: "DB Underhand Row", equip: "2×10kg", cues: "Supinated grip; elbows close; squeeze lats" },
    { name: "Single-Arm DB Row", equip: "1×10kg", cues: "Brace hard; elbow to hip; slow return" },
    { name: "DB Renegade Row (knees if needed)", equip: "2×5kg", cues: "Hips square; slow pull; no twisting" },

    { name: "Band Row", equip: "Heavy band", cues: "Squeeze shoulder blades; control return" },
    { name: "Band Lat Pulldown (anchor high)", equip: "Band", cues: "Drive elbows down; pause at bottom" },
    { name: "Band Face Pull", equip: "Light band", cues: "Pull to eyebrows; elbows high; 1s squeeze" },
    { name: "Band Pull-Aparts", equip: "Light band", cues: "Straight arms; squeeze mid-back" },

    { name: "DB Rear Delt Fly", equip: "2×5kg", cues: "Soft elbows; move from shoulder; no swing" },

    { name: "DB Hammer Curl", equip: "2×10kg or 2×5kg", cues: "Neutral grip; elbows pinned; slow eccentric" },
    { name: "DB Supinated Curl", equip: "2×10kg or 2×5kg", cues: "Full supination; avoid swinging" },
    { name: "DB Concentration Curl", equip: "1×10kg", cues: "Elbow on thigh; squeeze top; slow down" },
    { name: "Band Curl", equip: "Band", cues: "Constant tension; full ROM; controlled" },

    { name: "Scapular Pull-Ups", equip: "Pull-up bar", cues: "Arms straight; pull shoulder blades down; small controlled reps" },
    { name: "Mixed-Grip Pull-Ups", equip: "Pull-up bar (band assist optional)", cues: "Alternate grips each set; full hang; smooth pull" },
    { name: "Band Straight-Arm Pulldown", equip: "Band (anchor high)", cues: "Soft elbows; pull to thighs; lats tight; slow return" },
    { name: "Band High Row (elbows out)", equip: "Band (anchor chest-high)", cues: "Elbows wide; squeeze upper back; control return" },
    { name: "DB Reverse Fly + Hold", equip: "2×5kg", cues: "Soft elbows; lift to T; hold 1s at top" },
    { name: "Zottman Curl", equip: "2×5kg or 2×10kg", cues: "Curl up supinated; rotate; slow pronated lower" },
    { name: "Cross-Body Hammer Curl", equip: "2×5kg or 2×10kg", cues: "Curl across torso; keep elbow pinned; slow eccentric" },
    { name: "Band Hammer Curl", equip: "Band", cues: "Neutral grip; constant tension; full ROM" },

  ],

  push: [
    { name: "DB Strict Press", equip: "2×10kg (or 2×5kg)", cues: "Ribs down; glutes tight; smooth press" },
    { name: "DB Push Press", equip: "2×10kg (or 2×5kg)", cues: "Dip-drive; punch to lockout; no over-arch" },
    { name: "DB Arnold Press", equip: "2×5kg (or 2×10kg)", cues: "Rotate smoothly; avoid shrugging" },

    { name: "DB Floor Press", equip: "2×10kg", cues: "Elbows ~45°; pause on floor; press fast" },
    { name: "DB Squeeze Press (floor)", equip: "2×10kg", cues: "Press DBs together; slow down" },

    { name: "Push-Ups", equip: "Bodyweight", cues: "Full-body tension; chest to floor; lock out" },
    { name: "Close-Grip Push-Ups", equip: "Bodyweight", cues: "Elbows close; triceps bias; quality reps" },
    { name: "Pike Push-Ups", equip: "Bodyweight", cues: "Hips high; head between hands; control" },

    { name: "DB Lateral Raise", equip: "2×5kg", cues: "Raise to mid-chest; slow lower; no swing" },
    { name: "DB Front Raise", equip: "2×5kg", cues: "Stop at shoulder height; control down" },

    { name: "Band Triceps Pushdown", equip: "Band", cues: "Lock elbows; full extension; slow return" },
    { name: "Band Overhead Triceps Extension", equip: "Band", cues: "Long-head stretch; elbows narrow" },
    { name: "DB Overhead Triceps Extension", equip: "1×10kg or 2×5kg", cues: "Slow eccentric; elbows in" },
    { name: "DB Triceps Kickback", equip: "2×5kg", cues: "Hinge; elbows high; squeeze hard" },

    { name: "Hand-Release Push-Up", equip: "Bodyweight", cues: "Chest to floor; hands lift; press with full-body tension" },
    { name: "Band-Resisted Push-Up", equip: "Band", cues: "Band across upper back; elbows ~45°; lockout strong" },
    { name: "DB Push Jerk", equip: "2×10kg (or 2×5kg)", cues: "Dip-drive; punch under; stand tall to finish" },
    { name: "DB Crush Press (standing)", equip: "2×10kg", cues: "Press DBs together; keep ribs down; steady tempo" },
    { name: "Band Chest Press (anchor behind)", equip: "Band (anchor behind)", cues: "Stagger stance; press straight; control return" },
    { name: "DB Skull Crusher (floor)", equip: "2×5kg or 2×10kg", cues: "Upper arms vertical; bend elbows only; slow lower" },
    { name: "Band Lateral Raise", equip: "Light band", cues: "Stand on band; raise to shoulder height; slow down" },
    { name: "Band Overhead Press", equip: "Band", cues: "Ribs down; press straight up; avoid leaning back" },

  ],

  squat: [
    { name: "DB Goblet Squat", equip: "1×10kg", cues: "Elbows inside knees; full-foot pressure" },
    { name: "DB Front Squat", equip: "2×10kg (or 2×5kg)", cues: "DBs at shoulders; torso tall; brace" },
    { name: "DB Thruster", equip: "2×5kg (or 2×10kg)", cues: "Squat → drive overhead; steady breathing" },

    { name: "DB Reverse Lunge", equip: "2×5kg (or 2×10kg)", cues: "10 total = 5/leg; step back softly" },
    { name: "DB Split Squat", equip: "2×5kg", cues: "Control depth; knee tracks toes; upright torso" },
    { name: "DB Lateral Lunge", equip: "2×5kg", cues: "Sit back into hip; push floor away" },
    { name: "DB Step-Up (chair/box)", equip: "2×5kg (or 2×10kg)", cues: "Drive through full foot; control down" },

    { name: "Band Squat (band under feet)", equip: "Band", cues: "Knees out; constant tension; full depth" },
    { name: "Band Lateral Walk", equip: "Light band", cues: "Short steps; hips level; knees out" },

    { name: "Tempo Air Squat", equip: "Bodyweight", cues: "3s down; 1s pause; stand tall" },
    { name: "Squat Pulses", equip: "Bodyweight", cues: "Stay mid-range; constant tension" },

    { name: "Tempo Goblet Squat (3-1-1)", equip: "1×10kg", cues: "3s down; 1s pause; drive up; brace" },
    { name: "Bulgarian Split Squat (rear foot elevated)", equip: "2×5kg (or 2×10kg) + chair/bench", cues: "Front foot flat; torso tall; control depth" },
    { name: "Cossack Squat (side-to-side)", equip: "Bodyweight", cues: "Sit into hip; other leg straight; chest tall" },
    { name: "Wall Sit", equip: "Bodyweight", cues: "Back flat; knees ~90°; steady breathing" },
    { name: "Band Monster Walk", equip: "Light band", cues: "Hips back; knees out; small steps; constant tension" },
    { name: "DB Squat to Calf Raise", equip: "2×5kg (or bodyweight)", cues: "Stand tall; pause at top; controlled lowering" },
    { name: "DB Front-Rack March", equip: "2×10kg (or 2×5kg)", cues: "DBs at shoulders; tall posture; slow steps" },

  ],

  hinge: [
    { name: "DB Romanian Deadlift", equip: "2×10kg", cues: "Hips back; lats on; feel hamstrings" },
    { name: "DB Suitcase Deadlift", equip: "2×10kg", cues: "Brace; stand tall; avoid rounding" },
    { name: "DB Staggered-Stance RDL", equip: "2×10kg", cues: "70/30 stance; hinge; slow down" },
    { name: "DB Single-Leg RDL", equip: "1×10kg (or 2×5kg)", cues: "Square hips; reach long; control" },

    { name: "Band Good Morning", equip: "Heavy band", cues: "Band at hips; hinge; squeeze glutes" },
    { name: "Band Pull-Through (anchor low)", equip: "Band", cues: "Hinge back; snap hips through" },

    { name: "Glute Bridge", equip: "Bodyweight", cues: "Ribs down; full hip extension; pause" },
    { name: "DB Glute Bridge", equip: "1×10kg", cues: "Pause at top; knees steady" },

    { name: "DB Hang Clean (two DB)", equip: "2×10kg (or 2×5kg)", cues: "Jump-shrug; fast elbows; soft catch" },
    { name: "Single-Arm DB Snatch", equip: "1×10kg (or 1×5kg)", cues: "Hip drive; DB close; punch overhead" },
    { name: "DB Hip Hinge Swing (DB between legs)", equip: "1×10kg", cues: "Hinge not squat; snap hips; float DB" },

    { name: "DB Sumo Deadlift", equip: "2×10kg", cues: "Wide stance; hips back; chest up; drive through floor" },
    { name: "Band Deadlift (stand on band)", equip: "Band", cues: "Hinge; lats on; stand tall; control down" },
    { name: "Single-Leg Glute Bridge", equip: "Bodyweight", cues: "Ribs down; drive heel; hips level; pause top" },
    { name: "Hamstring Walkouts", equip: "Bodyweight", cues: "From bridge; walk heels out/in; keep hips high" },
    { name: "DB Hip Thrust (shoulders on couch)", equip: "1×10kg", cues: "Chin tucked; full hip extension; 1s pause" },
    { name: "Devil Press (DB)", equip: "2×10kg (or 2×5kg)", cues: "Burpee on DBs; hinge swing/clean to overhead" },
    { name: "Band Pull-Through (anchor low) — long stride", equip: "Band (anchor low)", cues: "Hinge back; snap hips; glutes squeeze" },
    { name: "DB Hang Power Clean + Front Squat", equip: "2×10kg (or 2×5kg)", cues: "Fast elbows; soft catch; squat tall" },

  ]
};
