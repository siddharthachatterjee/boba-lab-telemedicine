# Boba Lab Telemedicine Game
By Siddhartha Chatterjee

A browser-based work-simulation game for a Qualtrics experiment. The player works as a hospital doctor, diagnoses patients, calculates medication doses, and chooses what to do during breaks. Break choices create the core tradeoff: rest, take a medically related side job, study reference material, or do an unrelated driving task.

The current live implementation is in `index.html` and `index.js`. The JSON files are earlier/reference scene-data exports.

## Game Summary

The game models a multi-phase work week:

- **Tutorial** teaches the player the hospital task, dosage sliders, telemedicine, ride sharing, medical school, and reward rules.
- **Phase 1** runs a 5-day hospital week with 3 shifts per day and 2 patients per shift. The only side job is telemedicine.
- **Phase 3** runs another 5-day hospital week with a broader side-job menu: telemedicine, medical school, and ride sharing. Telemedicine can either match hospital patients or feature a different patient type, depending on the randomized transferability condition.

During hospital shifts, each patient is either:

- a **diagnosis task**, where the player chooses among diseases, or
- a **dosage task**, where the player uses a slider to calculate a dose from weight and mg/kg.

Between shifts, the player gets a timed decision window. They can take a real break or choose one of the available side jobs.

## Reward Rules

The sidebar shows current day, shift, job, total reward, and accuracy.

- Correct hospital diagnosis or dosage: **+$15**
- Incorrect hospital diagnosis: **-$5**
- Skipped hospital patient: **$0**
- Correct telemedicine answer: **+$5**
- Medical school: **$0**, but reveals reference information
- Ride sharing: **$0.50 per pickup**, capped by the 60-second minigame opportunity
- Break: **$0**, but resets continuous work time

If the player is inactive on a hospital patient, the game records the patient as skipped and advances. If they are inactive during a side job, the game returns them toward the normal break/shift flow.

## Transferability Condition

`index.js` randomly assigns:

```js
const MODE = Math.random() < 0.5 ? 0 : 1;
```

In Phase 3, this controls which telemedicine cases appear:

- `MODE === 0`: telemedicine uses the human-disease cases, matching the familiar hospital domain.
- `MODE === 1`: telemedicine uses alien-disease cases, creating a different patient type.

The selected condition is stored to Qualtrics as the `transferability` embedded-data field.

## How the Code Is Organized

### `index.html`

Defines the Qualtrics question markup and CSS:

- `#app-layout`: main flex layout
- `#main-content`: active scene area
- `#intro-overlay`: styled opening screen
- `#game-view`: title, story, chart, choices, and timers
- `#progress-sidebar`: day, shift, current job, total reward, accuracy, and job icon
- `#game-over`: legacy game-over container
- `#slider-container`: legacy slider container; the current implementation renders sliders inline in `#choices`

### `index.js`

Contains the full active game implementation.

Important top-level config:

- `PHASE_CONFIG`: source of truth for phase order, days, shifts, patients per shift, side-job availability, patient pools, and start scenes.
- `PHASE1_PATIENTS` / `PHASE3_PATIENTS`: patient queues used by each phase.
- `TRANSFERABILITY_SCENES`: telemedicine scene pools for low/high transferability.

Core classes:

- `GameInstance`: base scene engine. It displays scenes, renders choices, handles generic action items, timers, scoring, and game end.
- `TaskType`, `TaskManager`, `PerformanceTracker`: older/general task abstractions retained for task registration and history patterns.
- `DataCollector`: records trial-level arrays for phase, scene, type, answer, correctness, response time, timestamp, reward, and slider value.
- `SideJob`: data object describing each side job's id, name, reward, similarity, and start scene.
- `MainJobGameInstance`: main game subclass. This is where most current behavior lives: phase patients, side jobs, breaks, reward accounting, inactivity timers, summaries, reference charts, telemedicine login, ride-sharing minigame, and Qualtrics storage.
- `MainJobTaskManager`: older manager subclass that creates `MainJobGameInstance`.
- `PhaseOrchestrator`: sequences Tutorial → Phase 1 → Phase 3 and owns the shared `DataCollector`.

Scene data:

- `TELEMEDICINE_SCENES`: despite the name, this is the merged scene object for the whole game: tutorial, hospital patients, telemedicine cases, alien cases, medical school, ride sharing, and phase transitions.
- `ALL_SCENES`: alias to `TELEMEDICINE_SCENES`, used by `PhaseOrchestrator`.

Entry point:

```js
Qualtrics.SurveyEngine.addOnload(function() {
    const Q = this;
    Q.hideNextButton();
    ...
    orchestrator.start();
});
```

The Qualtrics Next button is hidden while the game runs and shown again after all phases complete.

### `scenes.json` and `telemedicine_data.json`

These are scene-data snapshots/reference files. The current Qualtrics build uses the scene object embedded directly in `index.js`.

## Scene Structure

Scenes are keyed objects. A typical diagnosis scene looks like:

```js
patient1: {
    title: "Patient ID: 1",
    story: "John presents with fever...",
    choices: [
        { text: "Pneumonia", next: "__nextPatient__", correct: true },
        { text: "Flu", next: "__nextPatient__", correct: false },
        { text: "Skip (no reward / no penalty)", next: "__nextPatient__", skip: true }
    ]
}
```

A dosage scene uses an action item:

```js
patient3: {
    title: "Patient ID: 3",
    story: "Calculate the correct medication dose...",
    actionItems: [
        {
            type: "slider",
            correctValue: 40,
            nextScene: "__nextPatient__",
            hint: "Multiply 80 kg by 0.5 mg/kg."
        }
    ]
}
```

Special sentinel scene keys:

- `__nextPatient__`: resolves the next patient, break, day transition, or phase end.
- `__return__`: exits the active side job and returns to the shift transition.
- `__phaseEnd__`: renders the phase summary and hands control back to `PhaseOrchestrator`.

Supported action item types include:

- `slider`: renders a dosage slider.
- `breakTimer`: triggers the break choice menu.
- `stopBreakTimer`: clears a break timer.
- `incrementTelemedicine`: increments the telemedicine session count.
- `teleLogin`: optionally gates telemedicine behind a password login.
- `uberGame`: starts the canvas ride-sharing minigame.
- `endGame`: renders final summary/end behavior.

## Main Gameplay Flow

1. `PhaseOrchestrator.start()` launches the first phase from `PHASE_CONFIG.phaseOrder`.
2. `MainJobGameInstance.start()` resets phase state, shuffles the phase patient pool, initializes the sidebar, and enters the phase start scene.
3. `displayScene("__nextPatient__")` calls `resolveNextPatient()`.
4. `resolveNextPatient()` returns the next patient until the shift quota is met.
5. After each shift, `startBreak` opens a 10-second decision window.
6. The player chooses a side job or takes a break. If no choice is made, a break starts automatically.
7. Side jobs return through `__return__`, then `shiftTransition`, then `__nextPatient__`.
8. After all days in a phase finish, `__phaseEnd__` shows a summary and the orchestrator launches the next phase.
9. After the final phase, Qualtrics Next is shown.

## Side Jobs

Side jobs are created by `buildAllSideJobs()`:

- **Telemedicine**
  - Similar to hospital diagnosis tasks.
  - Pays `$5` per correct answer.
  - Uses different scene pools depending on phase and transferability condition.

- **Medical School**
  - Pays `$0`.
  - Shows the full disease reference, including diseases that are not in the standard hospital chart.
  - Auto-returns after a short countdown unless the player returns early.

- **Ride Sharing**
  - Uses a canvas minigame.
  - Arrow keys steer a car on a grid.
  - Customers spawn and expire over time.
  - Reward is based on pickups.

## Data Collection

`DataCollector` records one row per trial into parallel arrays:

- `dc_phase`
- `dc_scene`
- `dc_type`
- `dc_answer`
- `dc_correct`
- `dc_time_ms`
- `dc_timestamp`
- `dc_reward`
- `dc_slider_val`
- `dc_total_trials`

`MainJobGameInstance.storeGameData()` also writes phase-level embedded data:

- `p1_gameDuration`, `p3_gameDuration`
- `p1_finalScore`, `p3_finalScore`
- `p1_telemedicineSessions`, `p3_telemedicineSessions`
- `p1_totalReward`, `p3_totalReward`
- `p1_continuousWorkTime`, `p3_continuousWorkTime`
- `p1_patientResults`, `p3_patientResults`
- `p1_sideJobSessions`, `p3_sideJobSessions`
- `transferability`

Tutorial data is intentionally not stored as phase-level data.

## Development Notes

This game is written as plain HTML, CSS, and JavaScript so it can be pasted into or hosted inside Qualtrics without a build step.

For local browser testing, Qualtrics APIs must be stubbed because `index.js` expects:

```js
Qualtrics.SurveyEngine.addOnload(...)
Qualtrics.SurveyEngine.setEmbeddedData(...)
Q.hideNextButton()
Q.showNextButton()
```

The implementation also includes a keyboard shortcut for testing: press `S` to skip/advance through many scene types.

## Editing Guide

- To change phase length or ordering, edit `PHASE_CONFIG`.
- To change which patients appear in a phase, edit `PHASE1_PATIENTS`, `PHASE3_PATIENTS`, or the matching patient scene definitions.
- To add a diagnosis patient, add a scene with `choices` and `correct` flags.
- To add a dosage patient, add a scene with a `slider` action item.
- To add or tune side jobs, edit `buildAllSideJobs()` and any referenced scenes.
- To modify exported Qualtrics fields, update `DataCollector.saveToQualtrics()` and/or `MainJobGameInstance.storeGameData()`.
