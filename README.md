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

____

## Cursor rotation (dynamic condition)
In the `dynamic` condition the cursor arrow continuously turns to face the direction of movement. It is implemented in `src/study/rotation.js` and configured under `cursor` in `src/core/config.js` and runs once per frame. The orientation is derived from pointer velocity, not from raw position, in four steps.

### 1. Fixed-window velocity
Per-frame position differences are unreliable because frame times vary across displays (60Hz, 120Hz ProMotion, …).Instead a short `{t, x, y}` history is kept and velocity is estimated over a fixed time window `velWindow` (25 ms):
```
v = (p(t) - p(t - velWindow)) / velWindow
```
`p(t - velWindow)` is linearly interpolated between the two surrounding history samples (`sampleAt()`), which makes the estimate independent of the refresh rate.

### 2. One Euro Filter on velocity
The velocity is smoothed with a One Euro Filter (Casiez et al. CHI 2012). Its low-pass uses a frame-rate-independent factor for cutoff `fc` over frame time `dt`:
```
a = smoothingFactor(fc, dt) 
  = 1 - exp(-2π * fc *dt)

smoothedV = a * v + (1 - a) * smoothedV
```
The cutoff adapts to speed: low at rest (kills jitter), higher when moving (kills lag). A low-passed speed estimate `smoothedSpeed` drives it:
```
speedRaw = hypot(vx, vy) / scale

aSpeed = smoothingFactor (dcutoff, dt)
       = 1 - exp(-2π * dcutoff * dt)

smoothedSpeed = aSpeed * speedRaw + (1 - aSpeed) * smoothedSpeed

fc = fcmin + beta * smoothedSpeed
```
Both components share the one `fc`. Filtering the velocity rather than the angle avoids the ±π-wrap-around an angular low-pass would hit.

### 3. Standstill dead zone
Below `minSpeed` the previous `angle` is returned unchanged, so the arrow does not chase meaningless micro-movements:
```
speed = hypot(smoothedVx, smoothedVy) / scale

if (speed < minSpeed) return angle
```

### 4. Target heading + orientation lag
The target is the smoothed velocity direction minus `imageAngle`. `angle` eases toward it with a second low-pass (`fcRot`), using `wrapAngle` for the shortest signed turn:
```
targetAngle = atan2(smoothedVy, smoothedVx) - imageAngle

diff = wrapAngle(targetAngle - angle)
     = atan2(sin(targetAngle - angle), cos(targetAngle - angle))

aRot = smoothingFactor(fcRot, dt)
     = 1 - exp(-2π * fcRot * dt)

angle = wrapAngle(angle + aRot * diff)
```
This lag is intentional and reportable, not a confound. Since every `smoothingFactor` call takes `dt`, the whole pipeline stays frame-rate independent.

### Parameters
| **Parameter** | **Value** | **Role** |
| ------------- | --------- | -------- |
| `velWindow` | 0.025 | Fixed differentiation window (seconds) |
| `dcutoff` | 1.0 | Cutoff of the speed-estimate low-pass |
| `fcmin` | 0.8 | Minimum velocity cutoff (standstill jitter) |
| `beta` | 0.02 | Cutoff rise with speed (lag during fast motion) |
| `minSpeed` | 20 | Dead-zone speed (scale-normalised px/s) |
| `fcRot` | 4 | Cutoff of the orientation-lag low-pass |
| `imageAngle | -π/2 - 20° | Baseline offset of the arrow |

____

## Counterbalancing
Within-subjects: every participant does all three cursor conditions in both tasks. Two things are counterbalanced (`src/core/counterbalance.js`).

### Between participants
The order of the three cursor conditions and of the two steering axes. Thats 6 cursor orders times 2 axis orders = 12 distinct links. The cursor order maps to a group index (0-5) via `groupIndex()`.

### Within each block
The order of the six measured conditions (Fitts: `3D x 2W`; steering `2A x 3W` per axis). Their order is one row of a 6 x 6 Williams Latin square.

### Williams square
A balanced Latin square where every condition immediately precedes and follows every other equally often. Built from a zig-zag first row, each next row shifted by one (`williams(n)`):
```
row 0 = | 0 | 5 | 1 | 4 | 2 | 3 |
row 1 = | 1 | 0 | 2 | 5 | 3 | 4 |
row 2 = | 2 | 1 | 3 | 0 | 4 | 5 |
row 3 = | 3 | 2 | 4 | 1 | 5 | 0 |
row 4 = | 4 | 3 | 5 | 2 | 0 | 1 |
row 5 = | 5 | 4 | 0 | 3 | 1 | 2 |
```

### Row selection 
```
row = (goup + modeIndex + (n/2) * round + 2 * axisIndex) mod n
```
- `group`: participant group (0-5), spreads the start row across participants
- `modeIndex`: cursor-mode index
    - `classic = 0`
    - `dynamic = 1`
    - `neutral = 2`
- `round`: repetition `(n/2) * round = 3 * round` jumps half the square, onto the rows round 1 did not use
- `axisIndex`: axis index (steering only; `0` for Fitts), offsets the two axes by two rows

____
