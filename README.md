# Mobility Flow

Open `index.html` directly, or serve this folder with any static web server. No build or account is required. Alpine 3.14.9 is bundled locally so workouts and the logbook work offline; external demonstration links still need internet access.

## Training

The primary session adapts Petar's Cycles 1 and 2, including spreadsheet comments. Original prescriptions are identified in the exercise source notes; reduced sets, paired sequencing, once-weekly frequency, muscle-up foundations and freestanding balance practice are adaptations. Later hypertrophy cycles do not override the Big 4 focus. Existing mobility data is preserved without changes.

Start with assisted OAC, pike presses, modest lean push-ups and assisted bar muscle-up components. Record assistance and technique. Progression suggestions require two completed, non-lighter primary sessions at the current level, upper rep targets on both sides, clean form, prescribed tempo and at least one rep in reserve on every relevant set. Suggestions never change your level automatically. Optional sessions do not count. Every fourth completed primary session recommends reduced sets; the user can choose whether to use it.

Estimated primary time at starting variations:

| Component | Approximate minutes |
| --- | ---: |
| Preparation and handstand practice | 12 |
| Muscle-up components, including two 90s rests | 5–7 |
| Pair A, including six 120s rests and three 30s side changes | 16–18 |
| Pair B, including six 90s rests | 11–13 |
| Face pulls, including two 60s rests | 4 |
| Equipment setup and transitions | 5–6 |

This supports approximately 55–60 minutes; untimed movements, variation choices and setup can change the total. Prescribed rest is not shortened to enforce a duration. The optional session includes three minutes of easy preparation and is approximately 20–25 minutes.

## Guided timing

Timed movement phases, holds and rests advance automatically. Movements without prescribed duration, including explosive phases, wait for “Next phase.” Start each set yourself. Select 2 or 3 seconds for the existing mobility descent range. Final-rep holds are separate from per-rep holds. The original “10 reps (5/side)” rotations use five reps per side. Wrist rocks guide the three existing hand positions; shoulder protocol moves remain manually advanced because the original routine does not specify individual patterns.

Petar's tempo notation is **lift, top pause, lower, bottom pause**, not the more common eccentric-first order. OAC negatives have a separate five-second accumulated descent clock: tap at the weakest point for the three-second pause, then finish the remaining descent. Lowering time excludes the pause and resets each rep. Pausing stops both clocks; timestamp deadlines account for background tabs. Reloaded sessions resume paused. Timer completion never fills actual results.

## Logbook and backups

Actual reps, holds by side, load, assistance, reps in reserve, form, tempo and notes are stored per set. Record results to advance, or skip the set. Sessions with skipped sets finish as partial. Pausing retains an unfinished session; save partial or abandoned sessions explicitly. Manual entries and additional sets can be added and history edited.

Storage is local to the browser and origin (opening by file and by HTTP may have separate histories). Dates default to Asia/Jerusalem. Export JSON regularly. Import into an empty logbook restores levels and an unfinished session; otherwise it merges history by ID, retaining local duplicates, levels and the local unfinished session. Invalid imports do not overwrite data. Storage failure leaves work in memory and displays an export reminder.

Run verification with `node --test tests/core.test.cjs`. Browser checks use `node tests/browser-check.cjs` when Chrome or Edge is installed.

The programming rationale draws on [resistance-training evidence](https://pmc.ncbi.nlm.nih.gov/articles/pmid/37414459/). These four advanced skill progressions are adaptations of the supplied trainer sheets; there is no guaranteed completion date.
