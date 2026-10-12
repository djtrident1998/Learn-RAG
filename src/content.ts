export const stages = [
  {
    id: "ingest",
    title: "Load documents",
    short: "Documents",
    subtitle: "Bring your knowledge in",
    color: "blue",
    concept:
      "Start with the information you want your assistant to know. A real system may ingest PDFs, web pages, database records, or support tickets.",
    why: "An LLM cannot access your private or recent information unless you supply it. Your sources define what the system can answer.",
    input: "Source documents",
    output: "Raw text and metadata",
    production:
      "Use connectors, access controls, incremental syncing, and document versioning. This playground accepts text and Markdown.",
  },
  {
    id: "parse",
    title: "Parse & clean",
    short: "Parse & clean",
    subtitle: "Make the content usable",
    color: "blue",
    concept:
      "Extract readable text, remove formatting noise, and preserve useful metadata such as the document title and source.",
    why: "Headers, navigation, broken layouts, and duplicate content can pollute retrieval. Clean inputs improve every later step.",
    input: "Raw source content",
    output: "Normalized plain text",
    production:
      "PDF parsing, OCR, table extraction, deduplication, and structure-aware parsers handle complex documents.",
  },
  {
    id: "chunk",
    title: "Split into chunks",
    short: "Chunking",
    subtitle: "Small pieces, useful context",
    color: "blue",
    concept:
      "Split long documents into smaller, overlapping passages. The simulator uses word windows; production systems often use tokenizer or sentence boundaries.",
    why: "Retrieving an entire document wastes context. Very small chunks can lose meaning. Overlap helps preserve information at chunk boundaries.",
    input: "Clean document text",
    output: "Overlapping text chunks",
    production:
      "Try recursive, sentence, semantic, or parent-child chunking. Measure retrieval quality as you change chunk size.",
  },
  {
    id: "embed",
    title: "Create embeddings",
    short: "Embeddings",
    subtitle: "Represent meaning as numbers",
    color: "purple",
    concept:
      "An embedding converts a text passage into a vector. Similar ideas should have nearby vectors. Here, a deterministic 96-dimensional feature hash with a small synonym map illustrates the process.",
    why: "Vector search helps find conceptually related text even when a question and document use different words.",
    input: "Text chunks",
    output: "96-dimensional demo vectors",
    production:
      "Use a trained embedding model. Real embeddings are learned, often 384–3,072 dimensions, and much better at semantic similarity.",
  },
  {
    id: "index",
    title: "Build the index",
    short: "Vector index",
    subtitle: "Give knowledge an address",
    color: "purple",
    concept:
      "Store vectors alongside their original text, IDs, and source metadata. This simulator keeps the index in memory and performs an exact similarity scan.",
    why: "A retrieval system needs an efficient way to find relevant passages among thousands or millions of chunks.",
    input: "Vectors + chunk metadata",
    output: "Searchable in-memory index",
    production:
      "Vector databases use approximate nearest neighbor indexes such as HNSW. Plan for metadata filtering, persistence, deletion, and permissions.",
  },
  {
    id: "query",
    title: "Understand the query",
    short: "Query encoding",
    subtitle: "A question becomes a vector",
    color: "purple",
    concept:
      "Normalize the question and embed it using the same method as the documents. The query and document vectors must share the same vector space.",
    why: "Using incompatible embedding models makes similarity scores meaningless. Query preprocessing also affects keyword matching.",
    input: "Your question",
    output: "Query terms + query vector",
    production:
      "Optional query rewriting, HyDE, multi-query expansion, and intent routing can improve ambiguous or multi-part questions.",
  },
  {
    id: "retrieve",
    title: "Retrieve candidates",
    short: "Hybrid search",
    subtitle: "Find the relevant pieces",
    color: "orange",
    concept:
      "Combine cosine similarity with BM25 keyword scores. The hybrid weight controls the balance between illustrative semantic matching and exact terms.",
    why: "Semantic search handles related concepts, while keyword search excels at exact names, identifiers, and rare terms.",
    input: "Query + searchable index",
    output: "Ranked candidate chunks",
    production:
      "Retrieve a broad candidate set, enforce permissions and metadata filters, and consider reciprocal rank fusion across retrievers.",
  },
  {
    id: "rerank",
    title: "Rerank results",
    short: "Reranking",
    subtitle: "Put the best evidence first",
    color: "orange",
    concept:
      "Reorder the candidate chunks with a second relevance signal. This demo combines the hybrid score with query-term coverage, then keeps your selected top K.",
    why: "The first search optimizes recall. Reranking helps improve precision before limited context space is used.",
    input: "Retrieved candidate chunks",
    output: "Top K evidence passages",
    production:
      "A cross-encoder evaluates each query–passage pair jointly. It is more accurate, but adds cost and latency. The demo uses a local heuristic.",
  },
  {
    id: "context",
    title: "Assemble context",
    short: "Context window",
    subtitle: "Pack the evidence carefully",
    color: "green",
    concept:
      "Collect the selected passages, attach numbered citations, and assemble the information the answer generator will receive.",
    why: "An answer can only be grounded in the context actually provided. Irrelevant or conflicting passages reduce answer quality.",
    input: "Selected evidence passages",
    output: "Numbered source context",
    production:
      "Deduplicate, compress, enforce a token budget, preserve provenance, and place important evidence where the model will use it.",
  },
  {
    id: "prompt",
    title: "Build the prompt",
    short: "Prompt assembly",
    subtitle: "Instructions meet evidence",
    color: "green",
    concept:
      "Combine system instructions, retrieved context, and the user question. Ask for source citations and explicitly allow the system to say it does not know.",
    why: "Clear grounding instructions reduce unsupported claims. Retrieved content should be treated as untrusted data, never as system instructions.",
    input: "Instructions + context + query",
    output: "The complete augmented prompt",
    production:
      "Use role-separated messages, injection defenses, conversation history, structured outputs, and explicit citation requirements.",
  },
  {
    id: "generate",
    title: "Generate an answer",
    short: "Grounded answer",
    subtitle: "Turn evidence into a response",
    color: "green",
    concept:
      "A production LLM reads the augmented prompt and generates an answer. Here, an extractive generator selects complete source sentences with citations and excludes statements explicitly about a different loan product when the question names just one.",
    why: "Generation makes retrieved information easy to consume. Every important claim should be supported by a source the user can inspect.",
    input: "Augmented prompt",
    output: "Evidence-based answer + citations",
    production:
      "Choose an LLM for your latency, quality, privacy, and cost requirements. Stream responses and verify that citations support the claims.",
  },
  {
    id: "evaluate",
    title: "Evaluate & improve",
    short: "Evaluation",
    subtitle: "Close the learning loop",
    color: "pink",
    concept:
      "Inspect query-term coverage, retrieved evidence, and citation support. These demo metrics are transparent heuristics, not proof of answer correctness.",
    why: "A fluent answer is not necessarily a correct answer. RAG needs separate checks for retrieval relevance, faithfulness, completeness, and user value.",
    input: "Query + evidence + answer",
    output: "Quality signals and feedback",
    production:
      "Build a labeled evaluation set. Measure recall@K, MRR, faithfulness, answer relevance, latency, cost, and human feedback across changes.",
  },
] as const;
export const sampleQuestions = [
  "I’m self-employed. What documents would I need for a home loan?",
  "What are the eligibility criteria for a personal loan?",
  "What documents are required for an education loan?",
  "How do processing fees differ across home, personal, and education loans?",
];
export const sampleQuestionLabels = [
  "Self-employed home loan",
  "Personal loan eligibility",
  "Education loan documents",
  "Compare processing fees",
];
