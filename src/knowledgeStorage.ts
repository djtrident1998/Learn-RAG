import { demoDocuments, type KnowledgeDocument } from "./engine";

// Identify only the original bundled samples. Custom uploads receive different IDs.
const legacySamples = [
  { id: "remote", title: "Remote work handbook", category: "People & culture" },
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
];
function legacyIndex(document: KnowledgeDocument): number {
  return legacySamples.findIndex(
    (sample) =>
      sample.id === document.id &&
      sample.title === document.title &&
      sample.category === document.category,
  );
}
export function migrateKnowledgeDocuments(
  documents: KnowledgeDocument[],
): KnowledgeDocument[] {
  const retainedIds = new Set(
    documents
      .filter((document) => legacyIndex(document) === -1)
      .map((document) => document.id),
  );
  return documents.flatMap((document) => {
    const index = legacyIndex(document);
    if (index === -1) return [document];
    const replacement = demoDocuments[index];
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
