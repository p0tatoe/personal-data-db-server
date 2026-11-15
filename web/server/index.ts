import express from "express";
import type { Request, Response } from "express";
import { initSchema, pool } from "./db.ts";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "ok" });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

await initSchema();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
