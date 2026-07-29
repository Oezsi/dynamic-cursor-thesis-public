/**
* log.js
*
* Collects session, block, trial and trajectory data in memory and converts
* a finished block into the row shapes expected by Supabse.
*/

// Rounds to n decimals; non-finite values become null.
function round(v, n) {
   if (v === null || v === undefined || !Number.isFinite(v)) return null;
   const f = Math.pow(10, n);
   return Math.round(v * f) / f;
}

// Creates a logger with encapsulated session/block state.
export function createLog() {
   let session = null;
   let current = null;

   // Starts a new session and stores its metadata;
   // returns the generated session id.
   function startSession(meta) {
      session = {
         id: crypto.randomUUID(),
         pId: meta.prolificPid ?? null,
         group: meta.group ?? null,
         age: meta.age ?? null,
         sex: meta.sex ?? null,
         handedness: meta.handedness ?? null,
         cursorOrder: meta.cursorOrder,
         axesOrder: meta.axesOrder,
         startedAt: meta.startedAt,
         timeOrigin: meta.timeOrigin,
         environment: meta.environment ?? {},
         config: meta.config ?? {},
      };
      return session.id;
   }

   // Session metadata as a Supabase row
   function sessionRow() {
      if (!session) return null;
      return {
         id: session.id,
         p_id: session.pId,
         group_index: session.group,
         age: session.age,
         sex: session.sex,
         handedness: session.handedness,
         cursor_order: session.cursorOrder,
         axes_order: session.axesOrder,
         started_at: session.startedAt,
         time_origin: session.timeOrigin,
         environment: session.environment,
         config: session.config,
      };
   }

   // Opens a new block; 
   // trials are collected into it until endBlock()
   function beginBlock(meta) {
      current = {
         id: crypto.randomUUID(),
         sessionId: session ? session.id : null,
         phase: meta.phase,
         cursorMode: meta.cursorMode,
         blockIndex: meta.blockIndex,
         round: meta.round,
         scale: meta.scale,
         debug: meta.debug === true,
         startedAt: performance.now(),
         endedAt: null,
         fitts: [],
         steering: [],
      };
      return current.id;
   }

   // Records one completed Fitts movement
   function fittsTrial(tr) {
      if (!current) return;
      current.fitts.push(tr);
   }

   // Records one completed steering traversal
   function steeringTrial(tr) {
      if (!current) return;
      current.steering.push(tr);
   }


   // ---- Convertion to Supabase rows ----

   // Shapes one Fitts trial into a fitts_trials row: 
   // nominal and scaled geometry, index of difficulty, 
   // movement time, all clicks with a miss count, and 
   // the trajectory.
   function fittsRow(b, tr) {
      return {
         id: crypto.randomUUID(),
         block_id: b.id,
         session_id: b.sessionId,
         condition_id: tr.conditionIndex,
         practice: tr.practice === true,
         d_nominal: tr.D,
         w_nominal: tr.W,
         d_scaled: round(tr.D * tr.scale, 3),
         w_scaled: round(tr.W * tr.scale, 3),
         id_nominal: round(Math.log2(tr.D / tr.W + 1), 6),
         from_index: tr.fromIndex,
         to_index: tr.toIndex,
         from_x: round(tr.fromX, 2),
         from_y: round(tr.fromY, 2),
         to_x: round(tr.toX, 2),
         to_y: round(tr.toY, 2),
         t_start: round(tr.tStart, 3),
         t_end: round(tr.tEnd, 3),
         mt: round(tr.tEnd - tr.tStart, 3),
         clicks: tr.clicks.map((c) => ({
            t: round(c.t, 3),
            x: round(c.x, 2),
            y: round(c.y, 2),
            hit: c.hit,
         })),
         n_misses: tr.clicks.filter((c) => !c.hit).length,
         samples: tr.samples.map((s) => ({
            t: round(s.t, 3),
            x: round(s.x, 2),
            y: round(s.y, 2),
            a: round(s.a, 4),
         })),
      };
   }

   // Shapes one steering trial into a steering_trials row:
   // geometry, steering index (A/W), movement time, wall-break
   // count and the trajectory.
   function steeringRow(b, tr) {
      return {
         id: crypto.randomUUID(),
         block_id: b.id,
         session_id: b.sessionId,
         condition_id: tr.conditionIndex,
         practice: tr.practice === true,
         axis: tr.axis,
         dir: tr.dir,
         a_nominal: tr.A,
         w_nominal: tr.W,
         a_scaled: round(tr.A * tr.scale, 3),
         w_scaled: round(tr.W * tr.scale, 3),
         id_steering: round(tr.A / tr.W, 6),
         t_start: round(tr.tStart, 3),
         t_end: round(tr.tEnd, 3),
         mt: round(tr.tEnd - tr.tStart, 3),
         attempts: tr.wallBreaks.length,
         wall_breaks: tr.wallBreaks.map((w) => ({
            t: round(w.t, 3),
            x: round(w.x, 2),
            y: round(w.y, 2),
         })),
         samples: tr.samples.map((s) => ({
            t: round(s.t, 3),
            x: round(s.x, 2),
            y: round(s.y, 2),
            a: round(s.a, 4),
         }))
      };
   }

   // Assembles the full upload payload for a block:
   // the block row plus its trial rows.
   function toPayload(b) {
      return {
         block: {
            id: b.id,
            session_id: b.sessionId,
            phase: b.phase,
            cursor_mode: b.cursorMode,
            block_index: b.blockIndex,
            round: b.round,
            scale: b.scale,
            started_at: round(b.startedAt, 3),
            ended_at: round(b.endedAt, 3),
            survey: b.survey ?? null,
         },
         fitts_trials: b.fitts.map((tr) => fittsRow(b, tr)),
         steering_trials: b.steering.map((tr) => steeringRow(b, tr)),
      };
   }

   // Ends the block and returns the finished Supabase payload.
   // (null for debug blocks) 
   function endBlock() {
      if (!current) return null;
      current.endedAt = performance.now();
      const b = current;
      current = null;
      if (b.debug) return null;
      return toPayload(b);
   }


   return {
      startSession,
      sessionRow,
      beginBlock,
      fittsTrial,
      steeringTrial,
      endBlock,
   };
}
