# RAG Studio

A complete, interactive RAG simulator for learning how documents become grounded answers. Built with React, TypeScript, and Vite, with a responsive lavender interface, an animated pipeline, and inspectable data at every step.

## Start

Requires Node.js 20.19+ or 22.12+ (validated with Node.js 24).

```sh
npm ci
npm run dev
```

Vite serves the app on port 5173. No API keys, database, or backend are required. In this cloud workspace, use `npm ci --cache /tmp/rag-npm-cache` if the default npm cache is not writable.

```sh
npm run build      # TypeScript validation and production output in dist/
npm run preview    # Serve the production build
npm test           # Simulation and saved-document migration tests
npm run test:e2e   # Desktop, mobile, and saved-document migration tests
```

Browser tests use `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to the executable location if Chromium is installed elsewhere. Playwright starts Vite automatically when needed.

## Loan eligibility & policies

The opening question is **“I’m self-employed. What documents would I need for a home loan?”** The examples cover product-specific eligibility checks, salaried and self-employed income documents, property and admission records, co-applicants, and processing fees. Example Bank and all thresholds, age limits, fees, and moratorium terms are fictional teaching policies. They are not live lender terms, jurisdiction-specific rules, personalized advice, or a loan approval. The app does not collect applications or make underwriting decisions.

## The complete workflow

1. **Load documents** — use four fictional Example Bank guides covering home loans, personal loans, education loans, and fees and application documents, paste your own text, or import `.txt` / `.md` files up to 200 KB.
2. **Parse and clean** — normalize text and strip basic Markdown and HTML formatting.
3. **Chunk** — split documents into overlapping word windows. Tune size and overlap to explore context tradeoffs.
4. **Embed** — inspect 96-dimensional deterministic vectors and their heatmap.
5. **Index** — connect vectors to chunk IDs, source titles, and original text in an in-memory index.
6. **Encode the query** — normalize the question and embed it in the same vector space.
7. **Retrieve** — combine BM25 keyword retrieval with cosine vector similarity using a configurable weight.
8. **Rerank** — optionally reorder candidates with a query-term coverage heuristic, then retain top K.
9. **Assemble context** — build numbered source passages.
10. **Assemble the prompt** — combine grounding instructions, context, and the question.
11. **Generate** — extract relevant source sentences with clickable citations, or abstain when no supporting sentence is found.
12. **Evaluate** — inspect query-term coverage, evidence passages, source support, and actual local compute time.

Click any pipeline stage for its explanation, input/output contract, and **Inspect live data** view. The learning guide explains how the same stage works in production and covers query rewriting, token budgets, access controls, source syncing, monitoring, and evaluation datasets.

## Explore

- **Playground:** run questions, follow the animation, inspect answers, retrieved passages, prompts, and the execution trace; copy answers and prompts or export the complete run as JSON.
- **Knowledge base:** add, inspect, and remove documents; preview chunks and vectors; restore missing sample documents without deleting custom ones.
- **Experiments:** tune chunk size, overlap, top K, vector/keyword balance, and reranking. Inspect the last 20 runs from the current session.
- **Learning guide:** explanations and production considerations for all twelve stages.

Documents and configuration persist in browser local storage. Older built-in workplace and astronomy examples are replaced with loan-policy guides on the next visit, while custom uploaded documents are preserved. Run history is session-only. Assets and fonts are bundled locally; application data is never sent to an external service. Exported run files include source content.

## What is simulated?

Parsing, chunking, BM25 scoring, cosine similarity, candidate selection, context construction, and source citations run locally. The embedding is a normalized feature hash with a small synonym map, **not a trained neural embedding model**. Reranking uses a transparent heuristic, **not a cross-encoder**. Generation selects complete source sentences, **not an LLM**. For questions naming one loan product, statements explicitly about another product are omitted from the answer; retrieved candidates remain visible for inspection. Chunk limits count whitespace-separated words, not model tokens.

The walkthrough animation is illustrative; its duration is not a latency measurement. The reported compute time measures local computation. Query-term coverage is an overlap signal, not an accuracy or faithfulness score. Hash collisions, missing synonyms, fragmented chunks, conflicting sources, and ambiguous questions can produce imperfect retrieval or incomplete answers—inspect the evidence rather than treating the scores as guarantees.

## Code map

- `src/engine.ts`: demo corpus, normalization, chunking, vectors, retrieval, reranking, prompt assembly, and extractive generation.
- `src/content.ts`: stage explanations, production notes, and sample questions.
- `src/App.tsx`: playground, library, experiments, guide, and accessible dialogs.
- `src/styles.css`: responsive design, graph layout, and reduced-motion support.
- `src/engine.test.ts`: algorithm and grounding checks.
- `src/knowledgeStorage.ts`: upgrade old demo samples while preserving custom documents.
- `src/knowledgeStorage.test.ts`: sample migration and storage recovery checks.
- `tests/app.spec.ts`: desktop/mobile journeys, document persistence, live-stage inspection, empty-state recovery, and export.

Each cloud task already has an isolated checkout. Develop in the existing `/workspace/Learn-RAG` directory; no extra Git worktree is needed.
