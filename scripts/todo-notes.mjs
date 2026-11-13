// The to-do page's notes (todo/, on the dev server only). What is written
// under each sound on http://127.0.0.1:5173/todo/ is kept in todo/notes.json,
// in the project, so that it can be read outside the browser as well.
//
//   GET  /__todo/notes                  → the whole file ({} while empty)
//   POST /__todo/notes { key, value }   → merges value into notes[key]
//
// Also sends /todo on to /todo/, where the page is.
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FILE = fileURLToPath(new URL("../todo/notes.json", import.meta.url));
const load = () => { try { return JSON.parse(readFileSync(FILE, "utf8")); } catch { return {}; } };
const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

export function todoNotes() {
  return {
    name: "todo-notes",
    apply: "serve",
    // (writing the notes must not reload the page)
    config: () => ({ server: { watch: { ignored: ["**/todo/notes.json"] } } }),
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (url === "/todo") { res.statusCode = 302; res.setHeader("Location", "/todo/"); res.end(); return; }
        if (url !== "/__todo/notes") { next(); return; }
        if (req.method === "GET") { json(res, 200, load()); return; }
        if (req.method !== "POST") { json(res, 405, { error: "GET or POST" }); return; }
        let body = "";
        req.setEncoding("utf8");
        req.on("data", (chunk) => { body += chunk; if (body.length > 1_000_000) req.destroy(); });
        req.on("end", () => {
          let key, value;
          try { ({ key, value } = JSON.parse(body)); } catch { /* answered below */ }
          if (typeof key !== "string" || !key || !value || typeof value !== "object") { json(res, 400, { error: "{ key, value }" }); return; }
          const notes = load();
          const updated = new Date().toISOString();
          notes[key] = { ...notes[key], ...value, updated };
          // written whole, then swapped in, so a half-written file is never left
          writeFileSync(`${FILE}.tmp`, `${JSON.stringify(notes, null, 2)}\n`);
          renameSync(`${FILE}.tmp`, FILE);
          json(res, 200, { ok: true, updated });
        });
      });
    },
  };
}
