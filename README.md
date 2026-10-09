# Human-in-the-loop LangGraph API

The existing Next.js app remains available through `npm run dev`. A separate Express API runs on port 3001:

```bash
npm run api:dev
```

The model uses the same Ollama server and model as the `llm-upgrades` project: `http://golem:11434` and `qwen3.8:27b-nvfp4`.

Submit a prompt to `POST /api/run`:

```json
{ "prompt": "Draft a concise reply to the customer." }
```

The response includes a `threadId` and a LangGraph interrupt payload with the draft for human review. Resume that run through `POST /api/resume`:

```json
{ "threadId": "id-from-the-first-response", "approved": true }
```

Set `approved` to `false` to reject the draft. The in-memory checkpointer is intended for local development; pending runs are lost when the API process restarts.
