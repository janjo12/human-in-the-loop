import { Annotation, Command, interrupt, isInterrupted, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

const State = Annotation.Root({
  prompt: Annotation<string>,
  draft: Annotation<string>,
  approved: Annotation<boolean | null>({
    reducer: (_current, next) => next,
    default: () => null,
  }),
  response: Annotation<string>,
});

export function createHumanReviewGraph(model: Pick<BaseChatModel, "invoke">) {
  return new StateGraph(State)
    .addNode("generate", async (state) => {
      const result = await model.invoke(state.prompt);
      return { draft: typeof result.content === "string" ? result.content : JSON.stringify(result.content) };
    })
    .addNode("review", async (state) => {
      const decision = interrupt({
        type: "human_review",
        message: "Approve this model response?",
        draft: state.draft,
      }) as { approved: boolean };
      return { approved: decision.approved };
    })
    .addNode("finish", (state) => ({
      response: state.approved ? state.draft : "Response rejected by reviewer.",
    }))
    .addEdge(START, "generate")
    .addEdge("generate", "review")
    .addEdge("review", "finish")
    .compile({ checkpointer: new MemorySaver() });
}

export type HumanReviewGraph = ReturnType<typeof createHumanReviewGraph>;
export { Command, isInterrupted };
