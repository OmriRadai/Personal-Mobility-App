# Mobility Flow

Open `index.html` directly, or serve this folder with any static web server. No build or account is required. Alpine 3.14.9 is bundled locally so workouts and the logbook work offline; external demonstration links still need internet access.

## Training

The primary session adapts Petar's Cycles 1 and 2, including spreadsheet comments. Preparation also uses the supplied Home Hero ebook (page 6) and Mobility Toolkit wrist movements. Original prescriptions are identified in the routine's source details; reduced sets, paired sequencing, once-weekly frequency, muscle-up foundations and freestanding balance practice are adaptations. Later hypertrophy cycles do not override the Big 4 focus. Existing mobility data is preserved without changes. See [source mapping](docs/training-sources.md).

Start with assisted OAC, pike presses, modest lean push-ups and assisted bar muscle-up components. Progression suggestions require two completed, non-lighter primary sessions at the current level, upper rep targets on both sides, and confirmation of clean form, prescribed tempo and at least one rep in reserve. The final review has one optional confirmation for this; older detailed records remain supported. Suggestions never change your level automatically. Optional sessions do not count. Every fourth completed primary session recommends reduced sets; the user can choose whether to use it.

Estimated primary time at starting variations:

| Component | Approximate minutes |
| --- | ---: |
| Preparation and handstand practice | 12 |
| Muscle-up components, including two 90s rests | 5–7 |
| Pair A, including six 120s rests and three 30s side changes | 16–18 |
| Pair B, including six 90s rests | 11–13 |
| Face pulls, including two 60s rests | 4 |
| Equipment setup and transitions | 5–6 |

This supports approximately 55–60 minutes including equipment setup and manual transitions; variations can change the total. Prescribed rest is not shortened to enforce a duration. The optional session includes three minutes of easy preparation and is approximately 20–25 minutes.

## Guided timing

The active screen contains the category/exercise title, current movement, set line, reps/hold target and timer controls. It contains no results form, notes, repeated-phase controls or early-finish controls. Start/resume and pause control a countdown for every movement. Timed phases and rests advance automatically; once the set is done, Next set starts a fresh, paused timer. The final set opens a results screen instead of saving invented performance.

Prescribed tempos, holds, final-rep holds and rest times retain their existing values. Where the sources give reps without a pace, the app supplies an estimated guided window (marked "guided pace"); it does not claim that duration came from the trainer. Ordinary unspecified movements default to 3 seconds per rep, wrist directions have separate timers, and the unspecified shoulder protocol remains a single 120-second guided window with its existing 20-reps-per-move target. Its movements are not invented. The existing 2–3-second descent range defaults to 2 seconds. Per-side rotations retain five reps per side when the source says 10 total.

Petar's tempo notation is **lift, top pause, lower, bottom pause**. OAC negative reps have an eight-second work window for five seconds of descent plus the three-second hold at the user's weak point; the app does not choose that position. Primary handstand control uses five 30-second attempts with 30-second rests, within Home Hero's 3–5 sets of 30–60 seconds. Reloaded timers resume paused, using timestamps to account for background tabs. Legacy unfinished sessions retain their exercises and results and receive the new guide when resumed.

## Logbook and backups

Record actual results only after the workout: seconds per set for holds and accumulated handstand practice, reps per set for rep-based exercises, and separate sides where applicable. Exercise and workout notes appear only here. Blank sets save as partial; timer completion never fills actual results. The review itself autosaves and can be resumed after a reload. Existing detailed records keep their load, assistance and other metadata. Delete session discards pending work or removes a chosen saved workout. Starting any new workout automatically deletes the unfinished session, including across categories, without confirmation. Manual entries can be added and history edited.

Storage is local to the browser and origin (opening by file and by HTTP may have separate histories). Dates default to Asia/Jerusalem. Export JSON regularly. Import into an empty logbook restores levels and an unfinished session; otherwise it merges history by ID, retaining local duplicates, levels and the local unfinished session. Invalid imports do not overwrite data. Storage failure leaves work in memory and displays an export reminder.

The workout editor groups sets into one card per exercise with just reps (or seconds), sets and notes. Enter one value for every set, comma-separated values for different sets, or slash-separated values for different sides. Existing hidden metadata and per-set notes are preserved when unchanged. Save and Delete session remain at the top while scrolling. Deleting an active session closes the workout and returns to routines; deleting a saved workout closes the editor and removes only that logbook entry.

Run verification with `node --test tests/core.test.cjs`. Browser checks use `node tests/browser-check.cjs` when Chrome or Edge is installed.

The programming rationale draws on [resistance-training evidence](https://pmc.ncbi.nlm.nih.gov/articles/pmid/37414459/). These four advanced skill progressions are adaptations of the supplied trainer sheets; there is no guaranteed completion date.
