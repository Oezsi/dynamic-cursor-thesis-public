# dynamic-cursor-thesis

Browser-based Fitts' Law experiment for a bachelor's thesis in HCI.
(Eberhard Karls Universität Tübingen)

Investigates how the orientation of the mouse cursor affects performance in a discrete pointing taks and a continuous path-following task. Three cursor conditions are compared:

| **Mode** | **Behaviour** |
| -------- | ------------- |
| `classic` | Standard arrow, fixed orientation |
| `dynamic` | Arrow rotates continuously to face the direction of movement |
| `neutral` | Orientation-neutral cursor shape |

The rotation angle is derived from the pointer velocity and smoothed with a One Euro Filter (Casiez et al. 2012).

## Status
Feature-complete, pre-collection. JavaScript + Canvas API, no build step.
Runs as an unsupervised online study, deployed via GitHub Pages.

## Run locally
Serve statically, e.g. 
```python3 -m http.server 8000```
The study requires the `cursor` and `axes` URL parameters (see below), so open it with valid link, for example:
```http://localhost:8000```
Without valid parameters the app shows a "broken study link" screen and does not start. Append `&debug=1` to skip fullscreen enforcement while developing.

## URL parameters

| **Parameter** | **Example** | **Effect** |
| ------------- | ----------- | ---------- |
| `cursor` | `?cursor=cdn` | Overrides the cursor order (`c`/`d`/`n`, allthree, norepeats) |
| `axes` | `?axes=vh` | Overrides the steering axis order (`h` = horizontal, `v` = vertical) |
| `PID` | `?PID=...` | Participant's Prolific ID (appended automatically by Porlific); stored to identify and pay submission |
| `debug`| `?debug=1` | Skips fullscreen enforcement, enables single-block shortcuts |


`cursor`, `axes`, `PID` are strictly required: missing or invalid values show a config-error screen and the study does not start.

## Study design
Within-subjects, all participants complete all three cursor conditions in both tasks. The presentation order of conditions within a block follows a row of Williams Latin square (deterministic per participant, cursor mode, round and axis); there is no random shuffling.

### Fitts' Law task
Multidirectional tapping following ISO 9241-9, with N = 13 targets arranged on a circle and a visiting step of 7.

- **D** (distance): 300, 500, 700
- **W** (target width): 20, 100
- 6 measured conditions per block, ordered by the Williams row
- Preceded by one practice condition (D = 500, W = 50)

### Steering Law task
Continuous traversal of a straight tunnel, run once per axis.

- **A** (tunnel length): 525, 700
- **W** (tunnel width): 35, 60, 112
- Axes: horizontal and vertical
- 6 measured condition per axis, ordered by the Williams row
- Each axis preceded by one practice condition (A = 600, W = 60)

### Scaling
All D/W/A values above are nominal, defined for a reference viewport height of 900px. The applied scaling factor is `window.innerHeight / 900`, recomputed at the start of each block (`core/config.js` -> `rescale()`), once fullscreen is active. Both nominal and scaled geometry are stored per trial.

### Fullscreen
Fullscreen is entered from the welcom screen and enforced for the rest of the session. Leaving it pauses the study, shows a guard screen and the affected block is restarted.

## Configuration
The central knobs live in `src/core/config.js`:

- `experiment.rounds`: how often each cursor condition is repeated per phase
- `experiment.phaseOrder`: task order (Fitts, then Steering)
- `experiment.practice`: practice conditions per task
- `cursor.*`: One Euro Filter parameters (`fcmin`, `beta`, `dcutoff`,...) and the orientation-lag cutoff (`fcRot`)
- `fitts.*`/`steering.*`: the condition grids

## Data collection
Rows are uploaded to Supabase (PostgREST) after each block, with a final flush at the end of the session. Four tables:

| **Table** | **One row per** |
| --------- | --------------- |
| `session` | Participant session (demographics, order, environment, config) |
| `blocks` | Block (phase, cursor mode, scale, timing) |
| `fitts_trials` | Movement between two targets (MT, clicks, misses, trajectory) |
| `steering_trials` | Tunnel traversal (MT, exits, trajectory) |

Trajectory samples are stored as JSONB on the trial rows.
