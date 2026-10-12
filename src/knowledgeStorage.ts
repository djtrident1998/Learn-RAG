import { demoDocuments, type KnowledgeDocument } from "./engine";

// Identify prior bundled samples only. Custom uploads receive different IDs.
const legacyCorpora = [
  [
    {
      id: "remote",
      title: "Remote work handbook",
      category: "People & culture",
    },
    {
      id: "benefits",
      title: "Benefits & wellbeing",
      category: "People & culture",
    },
    {
      id: "onboarding",
      title: "Your first 30 days",
      category: "Getting started",
    },
    { id: "security", title: "Security essentials", category: "IT & security" },
  ],
  [
    {
      id: "solar-system",
      title: "A tour of the solar system",
      category: "Space & planets",
    },
    {
      id: "moon",
      title: "The Moon and its phases",
      category: "Our cosmic neighbor",
    },
    {
      id: "telescopes",
      title: "Telescopes and binoculars",
      category: "Tools for exploring",
    },
    {
      id: "stargazing",
      title: "Your first night stargazing",
      category: "Hands-on discovery",
    },
  ],
];
function replacementFor(
  document: KnowledgeDocument,
): KnowledgeDocument | undefined {
  for (const corpus of legacyCorpora) {
    const index = corpus.findIndex(
      (sample) =>
        sample.id === document.id &&
        sample.title === document.title &&
        sample.category === document.category,
    );
    if (index !== -1) return demoDocuments[index];
  }
  return undefined;
}
export function migrateKnowledgeDocuments(
  documents: KnowledgeDocument[],
): KnowledgeDocument[] {
  const retainedIds = new Set(
    documents
      .filter((document) => !replacementFor(document))
      .map((document) => document.id),
  );
  return documents.flatMap((document) => {
    const replacement = replacementFor(document);
    if (!replacement) return [document];
    if (retainedIds.has(replacement.id)) return [];
    retainedIds.add(replacement.id);
    return [{ ...replacement }];
  });
}
export function loadKnowledgeDocuments(): KnowledgeDocument[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("rag-documents") ?? "null",
    );
    if (
      Array.isArray(value) &&
      value.every(
        (document) =>
          document &&
          ["id", "title", "text", "category"].every(
            (key) => typeof document[key] === "string",
          ),
      )
    ) {
      return migrateKnowledgeDocuments(value as KnowledgeDocument[]);
    }
  } catch {
    // Unavailable or invalid browser storage should not prevent opening the demo.
  }
  return demoDocuments;
}
