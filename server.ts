import { ChatOllama } from "@langchain/ollama";
import { createApi } from "./lib/api";
import { createHumanReviewGraph } from "./lib/human-review";

const PORT = Number(process.env.PORT ?? 3001);
const model = new ChatOllama({
  baseUrl: "http://golem:11434",
  model: "qwen3.8:27b-nvfp4",
  temperature: 0,
});

createApi(createHumanReviewGraph(model)).listen(PORT, () => {
  console.log(`Human-in-the-loop API listening on http://localhost:${PORT}`);
});
