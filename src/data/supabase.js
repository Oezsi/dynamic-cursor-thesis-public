/**
* supabase.js
*
* Uploads session and block data to Supabase via PostgREST.
* Blocks are queued and flushed after each block, with a final
* flush at the end.
*/

let cfg = null;
let cfgTried = false;

// Loads supabase-config.js lazily;
// returns null if its missing.
async function config() {
   if (cfgTried) return cfg;
   cfgTried = true;
   try {
      const m = await import("./supabase-config.js");
      if (!m.SUPABASE_URL || !m.SUPABASE_ANON_KEY) {
         throw new Error("SUPABASE_URL oder SUPABASE_ANON_KEY fehlt");
      }
      cfg = {
         url: String(m.SUPABASE_URL).replace(/\/+$/, ""),
         key: String(m.SUPABASE_ANON_KEY),
      };
   } catch (e) {
      console.warn(
         "supabase: invalid configuration, upload deactivated.",
         e,
      );
      cfg = null;
   }
   return cfg;
}

// POSTs rows to a table. Treats 409 as success so retries are
// indempotent; any other non-2xx status throws.
async function insert(c, table, rows) {
   if (!rows || rows.length === 0) return;
   const res = await fetch(`${c.url}/rest/v1/${table}`, {
      method: "POST",
      headers: {
         apikey: c.key,
         Authorization: `Bearer ${c.key}`,
         "Content-Type": "application/json",
         Prefer: "return=minimal",
      },
      body: JSON.stringify(rows),
   });
   if (!res.ok) {
      if (res.status === 409) return;
      const body = await res.text().catch(() => "");
      throw new Error(`${table}: HTTP ${res.status} ${body}`);
   }
}

// Creates the uploader with an in-memory pending queue
export function createUploader() {
   let sessionRow = null;
   let sessionDone = false;
   let running = false;
   const pending = [];

   function setSession(row) {
      sessionRow = row;
      sessionDone = false;
   }

   function enqueue(payload) {
      if (payload) pending.push(payload);
   }

   function pendingCount() {
      return pending.length;
   }

   // Works through the queue: session first (once), then each pending block in order.
   // Retruns true when the queue is empty, false if anything remains for a later retry.
   async function flush() {
      if (running) return pending.length === 0;
      running = true;
      try {
         const c = await config()
         if (!c) return false;

         if (sessionRow && !sessionDone) {
            await insert(c, "sessions", [sessionRow]);
            sessionDone = true;
         }

         while (pending.length > 0) {
            const p = pending[0];
            await insert(c, "blocks", [p.block]);
            await insert(c, "fitts_trials", p.fitts_trials);
            await insert(c, "steering_trials", p.steering_trials);
            pending.shift();
            console.log(
               `supabase: block ${p.block.block_index} (${p.block.phase}/${p.block.cursor_mode}) send`,
            );
         }
         return true;
      } catch (e) {
         console.error(
            `supabase: upload failed, ${pending.length} block(s) stay in queue.`,
            e,
         );
         return false;
      } finally {
         running = false;
      }
   }

   return { setSession, enqueue, pendingCount, flush };
}
