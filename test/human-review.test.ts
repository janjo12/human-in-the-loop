import { AIMessage } from "@langchain/core/messages";
import { describe, expect, it, vi } from "vitest";
import { createHumanReviewGraph, Command, isInterrupted } from "../lib/human-review";

describe("human review graph", () => {
  it("interrupts with the generated draft and resumes with approval", async () => {
    const model = { invoke: vi.fn().mockResolvedValue(new AIMessage("A careful draft.")) };
    const graph = createHumanReviewGraph(model as never);
    const config = { configurable: { thread_id: "approved-thread" } };

    const paused = await graph.invoke(
      { prompt: "Write a reply", draft: "", approved: null, response: "" },
      config,
    );
    expect(isInterrupted(paused)).toBe(true);
    if (!isInterrupted(paused)) throw new Error("Expected a review interrupt");
    expect(paused.__interrupt__[0].value).toMatchObject({
      type: "human_review",
      draft: "A careful draft.",
    });
    expect(model.invoke).toHaveBeenCalledOnce();

    const resumed = await graph.invoke(new Command({ resume: { approved: true } }), config);
    expect(resumed.response).toBe("A careful draft.");
    expect(model.invoke).toHaveBeenCalledOnce();
  });

  it("returns a rejection response when the reviewer declines", async () => {
    const graph = createHumanReviewGraph({
      invoke: vi.fn().mockResolvedValue(new AIMessage("Unsafe draft.")),
    } as never);
    const config = { configurable: { thread_id: "rejected-thread" } };

    await graph.invoke({ prompt: "Write a reply", draft: "", approved: null, response: "" }, config);
    const resumed = await graph.invoke(new Command({ resume: { approved: false } }), config);

    expect(resumed.response).toBe("Response rejected by reviewer.");
  });
});
