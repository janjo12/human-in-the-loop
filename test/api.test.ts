import { AIMessage } from "@langchain/core/messages";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApi } from "../lib/api";
import { createHumanReviewGraph } from "../lib/human-review";

function createTestApp() {
  const model = { invoke: vi.fn().mockResolvedValue(new AIMessage("Reviewed draft.")) };
  const graph = createHumanReviewGraph(model as never);
  return { app: createApi(graph), model };
}

describe("Express API", () => {
  it("serves health status", async () => {
    const { app } = createTestApp();
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("requires a non-empty prompt", async () => {
    const { app } = createTestApp();
    const response = await request(app).post("/api/run").send({ prompt: "  " });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/prompt is required/i);
  });

  it("returns an interrupt and accepts a human decision", async () => {
    const { app, model } = createTestApp();
    const started = await request(app).post("/api/run").send({ prompt: "  Please draft this.  " });

    expect(started.status).toBe(200);
    expect(started.body.status).toBe("interrupted");
    expect(started.body.interrupt.draft).toBe("Reviewed draft.");
    expect(model.invoke).toHaveBeenCalledWith("Please draft this.");

    const resumed = await request(app).post("/api/resume").send({
      threadId: started.body.threadId,
      approved: true,
    });
    expect(resumed.status).toBe(200);
    expect(resumed.body.response).toBe("Reviewed draft.");
  });

  it("rejects malformed resume decisions", async () => {
    const { app } = createTestApp();
    const response = await request(app).post("/api/resume").send({ threadId: "thread", approved: "yes" });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a thread that is not waiting for review", async () => {
    const { app } = createTestApp();
    const response = await request(app).post("/api/resume").send({ threadId: "missing", approved: true });
    expect(response.status).toBe(404);
  });
});
