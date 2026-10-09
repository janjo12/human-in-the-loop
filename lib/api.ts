import express from "express";
import { randomUUID } from "node:crypto";
import { Command, isInterrupted, type HumanReviewGraph } from "./human-review";

export function createApi(graph: HumanReviewGraph) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.post("/api/run", async (req, res) => {
    const prompt = req.body?.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "A non-empty prompt is required." });
      return;
    }

    const threadId = randomUUID();
    try {
      const result = await graph.invoke(
        { prompt: prompt.trim(), draft: "", approved: null, response: "" },
        { configurable: { thread_id: threadId } },
      );
      if (isInterrupted(result)) {
        res.json({ threadId, status: "interrupted", interrupt: result.__interrupt__[0].value });
        return;
      }
      res.json({ threadId, status: "complete", response: result.response });
    } catch (error) {
      console.error("Graph invocation failed:", error);
      res.status(502).json({ error: "The model request failed." });
    }
  });

  app.post("/api/resume", async (req, res) => {
    const { threadId, approved } = req.body ?? {};
    if (typeof threadId !== "string" || !threadId.trim() || typeof approved !== "boolean") {
      res.status(400).json({ error: "threadId and boolean approved are required." });
      return;
    }

    try {
      const config = { configurable: { thread_id: threadId } };
      const snapshot = await graph.getState(config);
      if (!snapshot.next.includes("review")) {
        res.status(404).json({ error: "No resumable run was found for that threadId." });
        return;
      }
      const result = await graph.invoke(new Command({ resume: { approved } }), config);
      res.json({ threadId, status: "complete", response: result.response });
    } catch (error) {
      console.error("Graph resume failed:", error);
      res.status(404).json({ error: "No resumable run was found for that threadId." });
    }
  });

  return app;
}
