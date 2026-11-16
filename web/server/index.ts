import express from "express";
import type { Request, Response } from "express";
import { initSchema, pool, saveAdvertisers } from "./db.ts";
import { parseUpload } from "./parseAdvertisers.ts";

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

// The browser sends the file itself as the request body. express.raw collects
// it into a Buffer; the limit matches client_max_body_size in nginx.conf.
app.post(
  "/api/uploads",
  express.raw({ type: () => true, limit: "50mb" }),
  async (req: Request, res: Response) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "The upload was empty" });
      return;
    }

    let advertisers;
    try {
      advertisers = parseUpload(req.body.toString("utf8"));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }

    await saveAdvertisers(advertisers);

    const uploadedList = advertisers.filter((a) => a.source === "uploaded_list").length;
    res.status(201).json({
      total: advertisers.length,
      uploadedList,
      interaction: advertisers.length - uploadedList,
    });
  },
);

await initSchema();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
