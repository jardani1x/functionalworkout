$(document).ready(function() {
    alert("Welcome to the Functional Strength Workout Builder! Drag exercises from the library to build your routine. Adjust workout and recovery times as needed. Happy training! 💪");
    // --- DATA ---
    const exercises = {
        "Chest": ["Push-up", "Diamond Push-up", "Dips", "Bench Press", "Incline Dumbbell Press"],
        "Legs": ["Air Squat", "Back Squat", "Front Squat", "Overhead Squat", "Lunges", "Box Jumps", "Deadlift"],
        "Shoulders": ["Push Press", "Strict Press", "Handstand Push-ups", "Kettlebell Swings", "Lateral Raises", "Rear Delt Fly"],
        "Back": ["Pull-ups", "Chin-ups", "Bent Over Rows", "Good Mornings", "Sumo Deadlift High Pull"],
        "Full Body / Metcon": ["Burpees", "Wall Balls", "Thrusters", "Snatch", "Clean and Jerk", "Rowing"]
    };

    // --- STATE ---
    let workoutPlan = [];
    let currentExerciseIndex = 0;
    let isWorkoutRunning = false;
    let isPaused = false;
    let currentTimer = null;
    let currentPhase = 'workout'; // 'workout' or 'recovery'

    // --- UI ELEMENTS ---
    const $mainTimerDisplay = $('#main-timer-display');
    const $currentExerciseDisplay = $('#current-exercise-display');
    const $workoutBuilder = $('#workout-builder');
    const $startBtn = $('#start-workout');
    const $pauseBtn = $('#pause-workout');
    const $resetBtn = $('#reset-workout');

    // --- INITIALIZATION ---
    function initialize() {
        populateExercises();
        updateMainTimerDisplay(0);
    }

    // --- EXERCISE PANE & DRAG/DROP ---
    function populateExercises() {
        const $accordion = $('#workout-categories');
        $accordion.empty();
        $.each(exercises, function(category, list) {
            const categoryId = `collapse${category.replace(/[^a-zA-Z0-9]/g, "")}`;
            const headingId = `heading${category.replace(/[^a-zA-Z0-9]/g, "")}`;
            const accordionItem = `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="${headingId}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${categoryId}" aria-expanded="false" aria-controls="${categoryId}">
                            ${category}
                        </button>
                    </h2>
                    <div id="${categoryId}" class="accordion-collapse collapse" aria-labelledby="${headingId}" data-bs-parent="#workout-categories">
                        <div class="accordion-body">
                            <ul>${list.map(ex => `<li>${ex}</li>`).join('')}</ul>
                        </div>
                    </div>
                </div>`;
            $accordion.append(accordionItem);
        });

        // Make library exercises draggable
        $(".accordion-body ul li").draggable({
            helper: "clone",
            revert: "invalid",
            start: function() { $(this).css('opacity', 0.5); },
            stop: function() { $(this).css('opacity', 1); }
        });
    }

    // Make workout builder droppable
    $workoutBuilder.droppable({
        accept: ".accordion-body ul li",
        hoverClass: "drag-over",
        drop: function(event, ui) {
            if ($workoutBuilder.find('p').length) {
                $workoutBuilder.empty();
            }
            const exerciseName = ui.draggable.text();
            const workoutTime = parseInt($('#workout-time').text());
            const recoveryTime = parseInt($('#recovery-time').text());
            
            const exerciseData = { name: exerciseName, workout: workoutTime, recovery: recoveryTime };
            workoutPlan.push(exerciseData);
            
            renderWorkoutPlan();
        }
    });

    function renderWorkoutPlan() {
        $workoutBuilder.empty();
        if (workoutPlan.length === 0) {
            $workoutBuilder.html('<p class="text-muted">Drag exercises here to build your routine</p>');
            return;
        }
        $.each(workoutPlan, function(index, ex) {
            const item = $(`
                <div class="workout-item" data-index="${index}">
                    <span>${ex.name} (${ex.workout}s / ${ex.recovery}s)</span>
                    <i class="fas fa-times remove-item"></i>
                </div>
            `);
            $workoutBuilder.append(item);
        });
    }
    
    // Make workout plan sortable
    $workoutBuilder.sortable({
        update: function(event, ui) {
            const newOrder = [];
            $workoutBuilder.find('.workout-item').each(function() {
                const oldIndex = $(this).data('index');
                newOrder.push(workoutPlan[oldIndex]);
            });
            workoutPlan = newOrder;
            renderWorkoutPlan();
        }
    }).disableSelection();

    // Remove item from workout plan
    $workoutBuilder.on('click', '.remove-item', function() {
        const index = $(this).parent().data('index');
        workoutPlan.splice(index, 1);
        renderWorkoutPlan();
    });


    // --- TIMER CONTROLS ---
    $('.time-adjust').on('click', function() {
        const type = $(this).data('type');
        const action = $(this).data('action');
        const $el = $(`#${type}-time`);
        let currentValue = parseInt($el.text());

        if (action === 'increase') {
            currentValue += 5;
        } else if (action === 'decrease' && currentValue > 5) {
            currentValue -= 5;
        }
        $el.text(currentValue);
    });

    // --- WORKOUT LOGIC ---
    $startBtn.on('click', function() {
        if (workoutPlan.length === 0) {
            alert("Please build a workout first!");
            return;
        }
        if (isPaused) {
            isPaused = false;
            $startBtn.addClass('d-none');
            $pauseBtn.removeClass('d-none');
            startTimer(parseInt($mainTimerDisplay.text().split(':')[1]));
        } else {
            isWorkoutRunning = true;
            isPaused = false;
            currentExerciseIndex = 0;
            $startBtn.addClass('d-none');
            $pauseBtn.removeClass('d-none');
            startNextExercise();
        }
    });

    $pauseBtn.on('click', function() {
        isPaused = true;
        clearInterval(currentTimer);
        $pauseBtn.addClass('d-none');
        $startBtn.removeClass('d-none').text('Resume');
    });

    $resetBtn.on('click', function() {
        clearInterval(currentTimer);
        isWorkoutRunning = false;
        isPaused = false;
        workoutPlan = [];
        renderWorkoutPlan();
        $currentExerciseDisplay.text("Build Your Workout");
        updateMainTimerDisplay(0);
        $pauseBtn.addClass('d-none');
        $startBtn.removeClass('d-none').text('Start');
    });

    function startNextExercise() {
        if (currentExerciseIndex >= workoutPlan.length) {
            endWorkout();
            return;
        }
        currentPhase = 'workout';
        const exercise = workoutPlan[currentExerciseIndex];
        $currentExerciseDisplay.text(exercise.name);
        startTimer(exercise.workout);
    }

    function startTimer(duration) {
        let timeLeft = duration;
        updateMainTimerDisplay(timeLeft);

        currentTimer = setInterval(function() {
            if (isPaused) {
                clearInterval(currentTimer);
                return;
            }
            timeLeft--;
            updateMainTimerDisplay(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(currentTimer);
                handlePhaseEnd();
            }
        }, 1000);
    }

    function handlePhaseEnd() {
        if (currentPhase === 'workout') {
            const exercise = workoutPlan[currentExerciseIndex];
            if (exercise.recovery > 0) {
                currentPhase = 'recovery';
                $currentExerciseDisplay.text("Recovery");
                startTimer(exercise.recovery);
            } else {
                currentExerciseIndex++;
                startNextExercise();
            }
        } else { // recovery ended
            currentExerciseIndex++;
            startNextExercise();
        }
    }
    
    function endWorkout() {
        isWorkoutRunning = false;
        $currentExerciseDisplay.text("Workout Complete! 🎉");
        $pauseBtn.addClass('d-none');
        $startBtn.removeClass('d-none').text('Start');
    }

    function updateMainTimerDisplay(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        $mainTimerDisplay.text(`${mins}:${secs}`);
    }

    // --- PANE TOGGLE ---
    $('#toggle-pane').on('click', function() {
        $('#workout-pane').toggleClass('show');
        $('#main-content').toggleClass('pane-open');
    });

    // --- KICK IT OFF ---
    initialize();
});
