import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Braces,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Code2,
  Database,
  FileText,
  FlaskConical,
  GitBranch,
  Layers3,
  Lightbulb,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  PanelLeftClose,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Split,
  StepForward,
  Trash2,
  Upload,
  Workflow,
  X,
} from "lucide-react";
import {
  chunkDocuments,
  defaultConfig,
  demoDocuments,
  embed,
  normalizeConfig,
  parseDocument,
  simulate,
  tokenize,
  type Config,
  type KnowledgeDocument,
  type Run,
} from "./engine";
import { sampleQuestionLabels, sampleQuestions, stages } from "./content";
import { loadKnowledgeDocuments } from "./knowledgeStorage";
const icons = [
  FileText,
  Braces,
  Split,
  Boxes,
  Database,
  MessageSquareText,
  Search,
  SlidersHorizontal,
  Layers3,
  Code2,
  Sparkles,
  ShieldCheck,
];
type Page = "playground" | "knowledge" | "experiments" | "guide";
type Tab = "answer" | "retrieval" | "prompt" | "trace";
const playbackSpeeds = {
  quick: { delay: 250, label: "Quick · 0.25 s / step" },
  walkthrough: { delay: 1000, label: "Walkthrough · 1 s / step" },
  presentation: { delay: 2000, label: "Presentation · 2 s / step" },
};
type PlaybackSpeed = keyof typeof playbackSpeeds;
function loadPlaybackSpeed(): PlaybackSpeed {
  const value = stored<unknown>("rag-playback-speed", "presentation");
  return typeof value === "string" && Object.hasOwn(playbackSpeeds, value)
    ? (value as PlaybackSpeed)
    : "presentation";
}
function stored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function App() {
  const [page, setPage] = useState<Page>("playground");
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(
    loadKnowledgeDocuments,
  );
  const [config, setConfig] = useState<Config>(() =>
    normalizeConfig({
      ...defaultConfig,
      ...stored<Partial<Config>>("rag-config", {}),
    }),
  );
  const [query, setQuery] = useState(sampleQuestions[0]);
  const [run, setRun] = useState<Run | null>(null);
  const [history, setHistory] = useState<Run[]>([]);
  const [selected, setSelected] = useState(2);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] =
    useState<PlaybackSpeed>(loadPlaybackSpeed);
  const [progress, setProgress] = useState(-1);
  const [tab, setTab] = useState<Tab>("answer");
  const [settings, setSettings] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [documentView, setDocumentView] = useState<KnowledgeDocument | null>(
    null,
  );
  const [citation, setCitation] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRun = useRef<Run | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef<HTMLTextAreaElement>(null);
  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };
  useEffect(() => {
    try {
      localStorage.setItem("rag-documents", JSON.stringify(documents));
      localStorage.setItem("rag-config", JSON.stringify(config));
      localStorage.setItem("rag-playback-speed", JSON.stringify(playbackSpeed));
    } catch {
      setToast(
        "Browser storage is full. Changes are available for this session.",
      );
    }
  }, [documents, config, playbackSpeed]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAdding(false);
        setSettings(false);
        setInspecting(false);
        setDocumentView(null);
        setCitation(null);
        setExpanded(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const chunks = useMemo(
    () => chunkDocuments(documents, config),
    [documents, config],
  );
  const currentStage = stages[selected];
  const StageIcon = icons[selected];
  const isStale = Boolean(
    run &&
      (run.query !== query ||
        JSON.stringify(run.config) !== JSON.stringify(config) ||
        JSON.stringify(run.chunks) !== JSON.stringify(chunks)),
  );
  const stageRun = useMemo(
    () => (inspecting ? simulate(documents, query, config) : null),
    [inspecting, documents, query, config],
  );
  const updateConfig = (key: keyof Config, value: number | boolean) =>
    setConfig((c) => normalizeConfig({ ...c, [key]: value }));
  function startRun() {
    if (running || !query.trim() || !documents.some((d) => d.text.trim()))
      return;
    pendingRun.current = simulate(documents, query.trim(), config);
    setRunning(true);
    setPaused(false);
    setProgress(0);
    setSelected(0);
    setRun(null);
    setTab("answer");
    setCitation(null);
  }
  function advanceRun() {
    if (!running || !pendingRun.current) return;
    const step = progress + 1;
    if (step < stages.length) {
      setProgress(step);
      setSelected(step);
      return;
    }
    const result = pendingRun.current;
    pendingRun.current = null;
    setRun(result);
    setHistory((h) => [result, ...h].slice(0, 20));
    setRunning(false);
    setPaused(false);
    setProgress(stages.length);
    notify("Run complete. Follow the citations to explore the evidence.");
  }
  useEffect(() => {
    if (!running || paused) return;
    const scheduled = setTimeout(
      advanceRun,
      playbackSpeeds[playbackSpeed].delay,
    );
    timer.current = scheduled;
    return () => clearTimeout(scheduled);
  }, [running, paused, progress, playbackSpeed]);
  function stepRun() {
    if (!running) return;
    setPaused(true);
    advanceRun();
  }
  function resetRun() {
    if (timer.current) clearTimeout(timer.current);
    pendingRun.current = null;
    setRun(null);
    setRunning(false);
    setPaused(false);
    setProgress(-1);
    setSelected(2);
    setCitation(null);
  }
  function navigate(next: Page) {
    setPage(next);
    setSidebarOpen(false);
  }
  function openDocumentEditor(document?: KnowledgeDocument) {
    setEditingId(document?.id ?? null);
    setTitle(document?.title ?? "");
    setBody(document?.text ?? "");
    setFormError("");
    setDocumentView(null);
    setAdding(true);
  }
  function saveDocument() {
    if (!title.trim() || !body.trim()) {
      setFormError("Add a document title and some source text.");
      return;
    }
    if (body.length > 200000) {
      setFormError("Please keep each document below 200,000 characters.");
      return;
    }
    if (editingId) {
      setDocuments((current) =>
        current.map((document) =>
          document.id === editingId
            ? { ...document, title: title.trim(), text: body.trim() }
            : document,
        ),
      );
      notify("Document updated. Run again to use the latest knowledge.");
    } else {
      setDocuments((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          title: title.trim(),
          text: body.trim(),
          category: "Your documents",
        },
      ]);
      notify("Document added to your knowledge base.");
    }
    setAdding(false);
    setEditingId(null);
    setTitle("");
    setBody("");
    setFormError("");
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (!/\.(txt|md|markdown)$/i.test(file.name)) {
      setFormError("Choose a .txt or .md file.");
      return;
    }
    if (file.size > 200000) {
      setFormError("Choose a text file smaller than 200 KB.");
      return;
    }
    setTitle(file.name.replace(/\.[^.]+$/, ""));
    setBody(await file.text());
    setFormError("");
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied to clipboard.");
    } catch {
      notify(
        "Clipboard unavailable. You can select and copy the text directly.",
      );
    }
  }
  function exportRun() {
    if (!run) return;
    const blob = new Blob([JSON.stringify(run, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rag-studio-run.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("Run exported as JSON.");
  }
  const statFor = (index: number) =>
    [
      `${documents.length} sources`,
      "Text normalized",
      `${chunks.length} chunks`,
      "96 dimensions",
      `${chunks.length} vectors`,
      `${tokenize(query).length} query terms`,
      run ? `${run.retrieved.length} candidates` : "Hybrid · BM25 + vector",
      config.rerank ? `Top ${config.topK} · enabled` : "Reranking disabled",
      run
        ? `${run.context.split(/\s+/).length} words`
        : `Top ${config.topK} passages`,
      "Context + instructions",
      run
        ? run.grounded
          ? "Citations included"
          : "No matching evidence"
        : "Extractive demo",
      run
        ? `${Math.round(run.coverage * 100)}% term coverage`
        : "Inspect quality signals",
    ][index];
  const settingsContent = (
    <>
      <div className="setting-block">
        <div className="setting-heading">
          <label htmlFor="chunk-size">Chunk size</label>
          <span>{config.chunkSize} words</span>
        </div>
        <input
          id="chunk-size"
          type="range"
          min="20"
          max="180"
          step="10"
          value={config.chunkSize}
          onChange={(e) => updateConfig("chunkSize", +e.target.value)}
        />
        <p>Smaller chunks are focused. Larger chunks preserve more context.</p>
      </div>
      <div className="setting-block">
        <div className="setting-heading">
          <label htmlFor="overlap">Chunk overlap</label>
          <span>{config.overlap} words</span>
        </div>
        <input
          id="overlap"
          type="range"
          min="0"
          max={Math.min(Math.floor(config.chunkSize / 2), 60)}
          value={config.overlap}
          onChange={(e) => updateConfig("overlap", +e.target.value)}
        />
        <p>Repeated words help connect neighboring chunks.</p>
      </div>
      <div className="setting-block">
        <div className="setting-heading">
          <label htmlFor="top-k">Retrieved passages</label>
          <span>Top {config.topK}</span>
        </div>
        <input
          id="top-k"
          type="range"
          min="1"
          max="6"
          value={config.topK}
          onChange={(e) => updateConfig("topK", +e.target.value)}
        />
        <p>How many passages make it into the final context.</p>
      </div>
      <div className="setting-block">
        <div className="setting-heading">
          <label htmlFor="weight">Hybrid search balance</label>
          <span>{Math.round(config.semanticWeight * 100)}% vector</span>
        </div>
        <input
          id="weight"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.semanticWeight}
          onChange={(e) => updateConfig("semanticWeight", +e.target.value)}
        />
        <div className="range-labels">
          <span>Keyword (BM25)</span>
          <span>Vector similarity</span>
        </div>
      </div>
      <div className="setting-block toggle-row">
        <div>
          <strong>Rerank candidates</strong>
          <p>Refine relevance before generation.</p>
        </div>
        <button
          className={`toggle ${config.rerank ? "on" : ""}`}
          role="switch"
          aria-checked={config.rerank}
          aria-label="Rerank candidates"
          onClick={() => updateConfig("rerank", !config.rerank)}
        >
          <span />
        </button>
      </div>
      <button
        className="secondary full"
        onClick={() => {
          setConfig(defaultConfig);
          notify("Default settings restored.");
        }}
      >
        <RotateCcw size={14} /> Restore defaults
      </button>
    </>
  );
  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("playground")}
          aria-label="RAG Studio home"
        >
          <span className="brand-icon">
            <Workflow size={23} />
          </span>
          <span>
            rag<span className="brand-light">studio</span>
            <span className="brand-dot">.</span>
          </span>
        </button>
        <div className="workspace-label">
          YOUR WORKSPACE <span>PERSONAL</span>
        </div>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "playground", icon: Workflow, name: "Playground" },
              { id: "knowledge", icon: Database, name: "Knowledge base" },
              { id: "experiments", icon: FlaskConical, name: "Experiments" },
              { id: "guide", icon: BookOpen, name: "Learning guide" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} />
              {item.name}
              {item.id === "knowledge" && (
                <span className="nav-count">{documents.length}</span>
              )}
              {item.id === "playground" && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">THE BIG PICTURE</div>
        <div className="mini-journey">
          <div>
            <span className="mini-dot blue" />
            Your knowledge
          </div>
          <i />
          <div>
            <span className="mini-dot purple" />
            The right context
          </div>
          <i />
          <div>
            <span className="mini-dot green" />A grounded answer
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="learn-card">
            <span className="learn-icon">
              <Lightbulb size={19} />
            </span>
            <h3>Learn by doing.</h3>
            <p>
              One question. Every step.
              <br />
              Nothing hidden.
            </p>
            <button onClick={() => navigate("guide")}>
              Explore the guide <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="local-status">
            <span />
            Runs locally in your browser
            <ShieldCheck size={14} />
          </div>
          <div className="profile">
            <div className="avatar">Y</div>
            <div>
              <strong>Your learning space</strong>
              <span>Make knowledge click.</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <PanelLeftClose size={19} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {
                {
                  playground: "RAG playground",
                  knowledge: "Knowledge base",
                  experiments: "Experiments",
                  guide: "Learning guide",
                }[page]
              }
            </strong>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">
              <span /> INTERACTIVE DEMO
            </span>
            <button
              className="icon-button help-button"
              aria-label="Open learning guide"
              onClick={() => navigate("guide")}
            >
              <CircleHelp size={19} />
            </button>
            <span className="top-avatar">Y</span>
          </div>
        </header>
        <main>
          {page === "playground" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> LOAN ELIGIBILITY & POLICIES
                  </div>
                  <h1>
                    From knowledge to answers<span>.</span>
                  </h1>
                  <p>
                    Explore eligibility, fees, and required documents, one RAG
                    step at a time.
                  </p>
                </div>
                <div className="page-heading-actions">
                  <button
                    className="secondary"
                    onClick={() => navigate("knowledge")}
                  >
                    <Database size={16} /> Manage documents
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setSettings(true)}
                  >
                    <Settings2 size={16} /> Configure pipeline
                  </button>
                </div>
              </div>
              <section className="query-panel" aria-label="Ask a question">
                <div className="query-top">
                  <div className="query-title">
                    <span className="query-icon">
                      <MessageSquareText size={19} />
                    </span>
                    <div>
                      <h2>It starts with a question</h2>
                      <p>
                        Ask the fictional lender’s guides. See exactly where
                        each answer comes from.
                      </p>
                    </div>
                  </div>
                  <span className="source-indicator">
                    <Database size={13} />
                    {documents.length} documents connected
                  </span>
                </div>
                <div className="query-input-wrap">
                  <textarea
                    ref={queryRef}
                    aria-label="Your question"
                    rows={2}
                    value={query}
                    maxLength={1000}
                    placeholder="What would you like to know?"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter")
                        startRun();
                    }}
                  />
                  <button
                    className="primary run-button"
                    onClick={startRun}
                    disabled={
                      running ||
                      !query.trim() ||
                      !documents.some((d) => d.text.trim())
                    }
                  >
                    {running ? (
                      paused ? (
                        <Pause size={16} />
                      ) : (
                        <LoaderCircle size={16} className="spin" />
                      )
                    ) : (
                      <Play size={15} fill="currentColor" />
                    )}
                    {running
                      ? paused
                        ? "Simulation paused"
                        : "Running pipeline…"
                      : "Run simulation"}
                    {!running && <span>⌘ ↵</span>}
                  </button>
                </div>
                <p className="loan-demo-note">
                  <ShieldCheck size={13} /> Example Bank is fictional. These
                  policies illustrate RAG; they are not live lender terms or an
                  eligibility decision.
                </p>
                <div className="query-suggestions">
                  <span>TRY A QUESTION</span>
                  {sampleQuestionLabels.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => setQuery(sampleQuestions[i])}
                    >
                      {label}
                      <ArrowUpRight size={11} />
                    </button>
                  ))}
                </div>
              </section>
              <div className={`workspace-grid ${expanded ? "expanded" : ""}`}>
                <section className="pipeline-panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <Workflow size={17} />
                      <h2>The RAG pipeline</h2>
                      <span className="subtle-pill">12 steps</span>
                    </div>
                    <div className="panel-tools">
                      <span className="live-label">
                        <span className={running && !paused ? "pulsing" : ""} />
                        {running
                          ? paused
                            ? "PAUSED"
                            : "SIMULATING"
                          : run
                            ? "RUN COMPLETE"
                            : "READY TO EXPLORE"}
                      </span>
                      <button
                        className="icon-button"
                        title="Reset simulation"
                        aria-label="Reset simulation"
                        onClick={resetRun}
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        className="icon-button"
                        title={
                          expanded ? "Exit expanded view" : "Expand pipeline"
                        }
                        aria-label={
                          expanded ? "Exit expanded view" : "Expand pipeline"
                        }
                        onClick={() => setExpanded((v) => !v)}
                      >
                        {expanded ? <X size={16} /> : <Maximize2 size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="playback-bar">
                    <div className="playback-current" aria-live="polite">
                      <span className="playback-step-number">
                        {progress < 0
                          ? "–"
                          : `${String(Math.min(progress + 1, 12)).padStart(2, "0")}/12`}
                      </span>
                      <div>
                        <strong className="playback-step-name">
                          {running
                            ? stages[progress].title
                            : run
                              ? "Walkthrough complete"
                              : "Ready for your walkthrough"}
                        </strong>
                        <span>
                          {running
                            ? paused
                              ? "Paused · take a closer look"
                              : "Watch each step unfold"
                            : "Slow down, pause, or advance one step at a time"}
                        </span>
                      </div>
                    </div>
                    <div className="playback-controls">
                      <div className="playback-speed">
                        <label htmlFor="playback-speed">Animation speed</label>
                        <select
                          id="playback-speed"
                          value={playbackSpeed}
                          onChange={(e) =>
                            setPlaybackSpeed(e.target.value as PlaybackSpeed)
                          }
                        >
                          {Object.entries(playbackSpeeds).map(
                            ([value, speed]) => (
                              <option key={value} value={value}>
                                {speed.label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <button
                        className="secondary playback-button"
                        disabled={!running}
                        aria-label={
                          paused ? "Resume simulation" : "Pause simulation"
                        }
                        onClick={() => setPaused((value) => !value)}
                      >
                        {paused ? <Play size={14} /> : <Pause size={14} />}
                        <span>{paused ? "Resume" : "Pause"}</span>
                      </button>
                      <button
                        className="secondary playback-button"
                        disabled={!running}
                        aria-label="Next pipeline step"
                        onClick={stepRun}
                      >
                        <StepForward size={14} />
                        <span>Next step</span>
                      </button>
                    </div>
                    <div className="playback-progress">
                      <i
                        style={{
                          width: `${(Math.max(0, Math.min(progress + 1, 12)) / 12) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="pipeline-canvas">
                    <div className="lane-label">
                      <span className="lane-number">01</span> PREPARE YOUR
                      KNOWLEDGE{" "}
                      <span className="lane-caption">
                        Indexing · before a question is asked
                      </span>
                    </div>
                    <div className="flow-area">
                      <svg
                        className="flow-lines"
                        viewBox="0 0 800 410"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <defs>
                          <marker
                            id="arrow"
                            markerWidth="6"
                            markerHeight="6"
                            refX="4"
                            refY="3"
                            orient="auto"
                          >
                            <path d="M0,0 L6,3 L0,6" fill="#c7c5d5" />
                          </marker>
                        </defs>
                        {[
                          "M171 55 H230",
                          "M371 55 H430",
                          "M571 55 H630",
                          "M700 99 V154",
                          "M630 203 H571",
                          "M430 203 H371",
                          "M230 203 H171",
                          "M100 247 V302",
                          "M171 351 H230",
                          "M371 351 H430",
                          "M571 351 H630",
                        ].map((d, i) => (
                          <path
                            key={d}
                            d={d}
                            fill="none"
                            stroke={progress > i ? "#9787df" : "#d7d5df"}
                            strokeWidth="1.5"
                            strokeDasharray={
                              i === 3 || i === 7 ? "4 4" : undefined
                            }
                            markerEnd="url(#arrow)"
                          />
                        ))}
                      </svg>
                      <div className="flow-grid">
                        {stages.map((stage, index) => {
                          const Icon = icons[index];
                          const column =
                            index < 4
                              ? index + 1
                              : index < 8
                                ? 8 - index
                                : index - 7;
                          const row = Math.floor(index / 4) + 1;
                          const complete = run || progress > index;
                          return (
                            <button
                              key={stage.id}
                              style={{ gridColumn: column, gridRow: row }}
                              className={`flow-node ${stage.color} ${selected === index ? "selected" : ""} ${running && progress === index ? (paused ? "processing is-paused" : "processing") : ""} ${complete ? "complete" : ""}`}
                              onClick={() => setSelected(index)}
                              aria-label={`Step ${index + 1}: ${stage.title}`}
                              aria-pressed={selected === index}
                            >
                              <div className="node-top">
                                <span className="node-icon">
                                  <Icon size={19} />
                                </span>
                                <span
                                  className={`node-number ${complete ? "done" : ""}`}
                                >
                                  {complete ? (
                                    <Check size={12} />
                                  ) : (
                                    String(index + 1).padStart(2, "0")
                                  )}
                                </span>
                              </div>
                              <strong>{stage.short}</strong>
                              <span className="node-stat">
                                {statFor(index)}
                              </span>
                              <span className="node-port left" />
                              <span className="node-port right" />
                              {selected === index && (
                                <span className="selected-indicator" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="lane-label row-two">
                        <span className="lane-number">02</span> FIND WHAT
                        MATTERS{" "}
                        <span className="lane-caption">
                          Retrieval · follow the question
                        </span>
                      </div>
                      <div className="lane-label row-three">
                        <span className="lane-number">03</span> BUILD A GROUNDED
                        ANSWER{" "}
                        <span className="lane-caption">
                          Generation & evaluation
                        </span>
                      </div>
                    </div>
                    <div className="canvas-footer">
                      <div className="legend">
                        <span>
                          <i className="blue" />
                          Preparation
                        </span>
                        <span>
                          <i className="purple" />
                          Representation
                        </span>
                        <span>
                          <i className="orange" />
                          Retrieval
                        </span>
                        <span>
                          <i className="green" />
                          Generation
                        </span>
                      </div>
                      <span className="canvas-hint">
                        <span className="click-icon">↖</span> Click a step to
                        look inside
                      </span>
                    </div>
                  </div>
                  <div className="pipeline-footnote">
                    <Lightbulb size={15} />
                    <p>
                      <strong>A little context changes everything.</strong> RAG
                      gives a model relevant knowledge before it answers.
                    </p>
                  </div>
                </section>
                <aside className="inspector">
                  <div className="inspector-header">
                    <span>UNDER THE HOOD</span>
                    <span className="subtle-pill">
                      {String(selected + 1).padStart(2, "0")} / 12
                    </span>
                  </div>
                  <div className="inspector-body">
                    <span className={`detail-icon ${currentStage.color}`}>
                      <StageIcon size={25} />
                    </span>
                    <h2>{currentStage.title}</h2>
                    <p className="detail-subtitle">{currentStage.subtitle}</p>
                    <button
                      className="secondary inspect-data-button"
                      onClick={() => setInspecting(true)}
                    >
                      <Braces size={14} /> Inspect live data{" "}
                      <ArrowUpRight size={13} />
                    </button>
                    <p className="concept">{currentStage.concept}</p>
                    <div className="why-box">
                      <div>
                        <Lightbulb size={14} />
                        <strong>Why this matters</strong>
                      </div>
                      <p>{currentStage.why}</p>
                    </div>
                    <div className="io-row">
                      <span>INPUT</span>
                      <p>{currentStage.input}</p>
                    </div>
                    <div className="io-arrow">
                      <ArrowDown size={14} />
                    </div>
                    <div className="io-row">
                      <span>OUTPUT</span>
                      <p>{currentStage.output}</p>
                    </div>
                    {selected === 2 ? (
                      <div className="inline-config">
                        <div className="setting-heading">
                          <label htmlFor="inline-chunk">Chunk size</label>
                          <span>{config.chunkSize} words</span>
                        </div>
                        <input
                          id="inline-chunk"
                          type="range"
                          min="20"
                          max="180"
                          step="10"
                          value={config.chunkSize}
                          onChange={(e) =>
                            updateConfig("chunkSize", +e.target.value)
                          }
                        />
                        <div className="range-labels">
                          <span>Focused</span>
                          <span>More context</span>
                        </div>
                        <div className="chunk-mini">
                          {Array.from({ length: 7 }, (_, i) => (
                            <i key={i} style={{ opacity: 1 - i * 0.08 }} />
                          ))}
                          <span>{config.overlap}-word overlap</span>
                        </div>
                      </div>
                    ) : (
                      <div className="stage-live">
                        <span>CURRENT PIPELINE</span>
                        <strong>{statFor(selected)}</strong>
                      </div>
                    )}
                    <button
                      className="text-button"
                      onClick={() => {
                        setPage("guide");
                        setTimeout(
                          () =>
                            document
                              .getElementById(`guide-${selected}`)
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              }),
                          50,
                        );
                      }}
                    >
                      Explore this concept <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="inspector-pagination">
                    <button
                      disabled={selected === 0}
                      onClick={() => setSelected((i) => i - 1)}
                    >
                      ← Previous
                    </button>
                    <button
                      disabled={selected === 11}
                      onClick={() => setSelected((i) => i + 1)}
                    >
                      Next step <ArrowRight size={13} />
                    </button>
                  </div>
                </aside>
              </div>
              <section className="results-panel">
                <div className="results-header">
                  <div
                    className="result-tabs"
                    role="tablist"
                    aria-label="Simulation output"
                  >
                    {(
                      [
                        {
                          id: "answer",
                          name: "Generated answer",
                          icon: Sparkles,
                        },
                        {
                          id: "retrieval",
                          name: "Retrieved context",
                          icon: Layers3,
                        },
                        { id: "prompt", name: "Full prompt", icon: Code2 },
                        { id: "trace", name: "Run trace", icon: Activity },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        className={tab === t.id ? "active" : ""}
                        onClick={() => setTab(t.id)}
                      >
                        <t.icon size={15} />
                        {t.name}
                        {t.id === "retrieval" && run && (
                          <span>{run.ranked.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {run && (
                    <button
                      className="icon-button"
                      aria-label="Export run"
                      onClick={exportRun}
                      title="Export run"
                    >
                      <ArrowDownToLine size={16} />
                    </button>
                  )}
                </div>
                {isStale && (
                  <div className="stale-banner">
                    <RotateCcw size={14} /> Inputs have changed. Run again to
                    update these results.
                  </div>
                )}
                {!run ? (
                  <div className="empty-result">
                    <span
                      className={`empty-icon ${running && !paused ? "spin-slow" : ""}`}
                    >
                      <Sparkles size={25} />
                    </span>
                    <div>
                      <h3>
                        {running
                          ? `${paused ? "Paused · " : ""}${stages[Math.min(progress, 11)].title}${paused ? "" : "…"}`
                          : "Your next aha moment starts here."}
                      </h3>
                      <p>
                        {running
                          ? paused
                            ? "Take your time inspecting the evidence, then resume or advance one step."
                            : "Follow the highlighted step as your question travels through the pipeline."
                          : "Run the simulation to see an answer, its sources, and every step behind it."}
                      </p>
                    </div>
                    {!running && (
                      <button
                        className="text-button"
                        onClick={() => queryRef.current?.focus()}
                      >
                        Ask your first question <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="result-content" role="tabpanel">
                    {tab === "answer" && (
                      <div className="answer-layout">
                        <div className="answer-main">
                          <div className="answer-label">
                            <span className="answer-spark">
                              <Sparkles size={15} />
                            </span>{" "}
                            YOUR GROUNDED ANSWER{" "}
                            <span className="subtle-pill">
                              Extractive simulation
                            </span>
                            <button
                              className="icon-button"
                              aria-label="Copy answer"
                              onClick={() => copy(run.answer)}
                            >
                              <Clipboard size={14} />
                            </button>
                          </div>
                          <div className="answer-text">
                            {run.answer.split("\n\n").map((paragraph, i) => (
                              <p key={i}>
                                {paragraph.split(/(\[\d+\])/g).map((part, j) =>
                                  /^\[\d+\]$/.test(part) ? (
                                    <button
                                      key={j}
                                      className="citation"
                                      onClick={() =>
                                        setCitation(+part.slice(1, -1))
                                      }
                                      aria-label={`View source ${part.slice(1, -1)}`}
                                    >
                                      {part.slice(1, -1)}
                                    </button>
                                  ) : (
                                    part
                                  ),
                                )}
                              </p>
                            ))}
                          </div>
                          <div className="answer-sources">
                            {run.citations.map((source) => (
                              <button
                                key={source.number}
                                onClick={() => setCitation(source.number)}
                              >
                                <span>{source.number}</span>
                                <FileText size={12} />
                                {source.title}
                                <ArrowUpRight size={11} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="quality-card">
                          <span className="quality-label">
                            <ShieldCheck size={15} /> RUN SNAPSHOT
                          </span>
                          <div className="quality-number">
                            {Math.round(run.coverage * 100)}
                            <span>%</span>
                          </div>
                          <strong>Query-term coverage</strong>
                          <div className="quality-bar">
                            <i style={{ width: `${run.coverage * 100}%` }} />
                          </div>
                          <p>A simple overlap signal, not an accuracy score.</p>
                          <div className="quality-line">
                            <span>Evidence passages</span>
                            <strong>{run.ranked.length}</strong>
                          </div>
                          <div className="quality-line">
                            <span>Local compute</span>
                            <strong>{run.time.toFixed(1)} ms</strong>
                          </div>
                          <div className="quality-line">
                            <span>Source grounding</span>
                            <strong>
                              {run.grounded ? "Extracted" : "No evidence"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}
                    {tab === "retrieval" && (
                      <div className="retrieval-list">
                        <div className="result-intro">
                          <h3>The evidence behind the answer</h3>
                          <p>
                            {run.retrieved.length} candidates →{" "}
                            {run.ranked.length} selected passages. Scores are
                            relative demo signals.
                          </p>
                        </div>
                        {run.ranked.length ? (
                          run.ranked.map((c, i) => (
                            <article className="retrieval-card" key={c.id}>
                              <div className="retrieval-card-header">
                                <span className="source-number">{i + 1}</span>
                                <FileText size={15} />
                                <strong>{c.title}</strong>
                                <code>{c.id}</code>
                                <span className="score-badge">
                                  {Math.round(
                                    (run.config.rerank
                                      ? c.rerankScore
                                      : c.score) * 100,
                                  )}
                                  % relevance
                                </span>
                              </div>
                              <p>{c.text}</p>
                              <div className="retrieval-metrics">
                                <span>Vector {c.semantic.toFixed(3)}</span>
                                <span>BM25 {c.lexical.toFixed(3)}</span>
                                <span>Hybrid {c.score.toFixed(3)}</span>
                                <span>{c.tokens} words</span>
                              </div>
                            </article>
                          ))
                        ) : (
                          <p>
                            No matching passages. Add relevant source material
                            to the knowledge base.
                          </p>
                        )}
                      </div>
                    )}
                    {tab === "prompt" && (
                      <>
                        <div className="result-intro prompt-heading">
                          <div>
                            <h3>Exactly what a language model would receive</h3>
                            <p>
                              This prompt is assembled for inspection. No
                              external model is called.
                            </p>
                          </div>
                          <button
                            className="secondary"
                            onClick={() => copy(run.prompt)}
                          >
                            <Clipboard size={14} /> Copy prompt
                          </button>
                        </div>
                        <pre className="prompt-code">{run.prompt}</pre>
                      </>
                    )}
                    {tab === "trace" && (
                      <>
                        <div className="result-intro">
                          <h3>A transparent, end-to-end run</h3>
                          <p>
                            All computation runs locally. The animated
                            walkthrough is illustrative, not per-stage latency.
                          </p>
                        </div>
                        <div className="trace-list">
                          {stages.map((s, i) => (
                            <div className="trace-row" key={s.id}>
                              <span className="trace-check">
                                <Check size={13} />
                              </span>
                              <span className="trace-number">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <strong>{s.title}</strong>
                              <span>
                                {
                                  [
                                    `${new Set(run.chunks.map((c) => c.documentId)).size} source documents`,
                                    "Whitespace and Markdown normalized",
                                    `${run.chunks.length} chunks · ${run.config.overlap}-word overlap`,
                                    "96-dimensional feature hashing",
                                    "Exact cosine scan in memory",
                                    `${tokenize(run.query).length} query terms`,
                                    `${run.retrieved.length} candidates`,
                                    run.config.rerank
                                      ? "Coverage-based heuristic applied"
                                      : "Skipped by configuration",
                                    `${run.ranked.length} numbered passages`,
                                    "Grounding + abstention instructions",
                                    run.grounded
                                      ? "Relevant source sentences extracted"
                                      : "Abstained: no relevant source sentences",
                                    `${Math.round(run.coverage * 100)}% query-term coverage`,
                                  ][i]
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
              <footer className="page-footer">
                <span>
                  <ShieldCheck size={13} /> Your documents stay in this browser.
                </span>
                <span>
                  Real retrieval. Illustrative embeddings & generation.{" "}
                  <button onClick={() => navigate("guide")}>
                    How it works <ArrowUpRight size={11} />
                  </button>
                </span>
              </footer>
            </>
          )}
          {page === "knowledge" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> THE FOUNDATION
                  </div>
                  <h1>
                    Your knowledge, connected<span>.</span>
                  </h1>
                  <p>Give your assistant something worth knowing.</p>
                </div>
                <button
                  className="primary"
                  onClick={() => openDocumentEditor()}
                >
                  <Plus size={16} /> Add document
                </button>
              </div>
              <div className="knowledge-summary">
                <div>
                  <Database size={22} />
                  <strong>
                    {documents.length}
                    <span>Source documents</span>
                  </strong>
                </div>
                <div>
                  <Split size={22} />
                  <strong>
                    {chunks.length}
                    <span>Searchable chunks</span>
                  </strong>
                </div>
                <div>
                  <Boxes size={22} />
                  <strong>
                    96<span>Vector dimensions</span>
                  </strong>
                </div>
                <div>
                  <ShieldCheck size={22} />
                  <strong>
                    Local<span>Private by default</span>
                  </strong>
                </div>
              </div>
              <div className="section-title">
                <h2>
                  Source library{" "}
                  <span className="subtle-pill">
                    {documents.length} documents
                  </span>
                </h2>
                <button
                  className="text-button"
                  onClick={() => {
                    setDocuments((current) => [
                      ...current,
                      ...demoDocuments.filter(
                        (d) => !current.some((c) => c.id === d.id),
                      ),
                    ]);
                    notify("Missing sample documents restored.");
                  }}
                >
                  Restore sample documents <RotateCcw size={14} />
                </button>
              </div>
              <div className="document-grid">
                {documents.map((doc, i) => (
                  <article className="document-card" key={doc.id}>
                    <div className="document-card-top">
                      <span
                        className={`document-icon ${["purple", "blue", "orange", "green"][i % 4]}`}
                      >
                        <FileText size={24} />
                      </span>
                      <div className="document-actions">
                        <button
                          className="icon-button"
                          aria-label={`Edit ${doc.title}`}
                          title="Edit document"
                          onClick={() => openDocumentEditor(doc)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button delete-button"
                          aria-label={`Delete ${doc.title}`}
                          onClick={() => {
                            setDocuments((d) =>
                              d.filter((item) => item.id !== doc.id),
                            );
                            notify(
                              "Document removed. Restore samples or add it again anytime.",
                            );
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <span className="document-category">{doc.category}</span>
                    <h3>{doc.title}</h3>
                    <p>{doc.text.slice(0, 150)}…</p>
                    <div className="document-card-bottom">
                      <span>
                        {doc.text.split(/\s+/).length} words <i />{" "}
                        {chunks.filter((c) => c.documentId === doc.id).length}{" "}
                        chunks
                      </span>
                      <button
                        className="text-button"
                        onClick={() => setDocumentView(doc)}
                      >
                        Inspect <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </article>
                ))}
                <button
                  className="add-document-card"
                  onClick={() => openDocumentEditor()}
                >
                  <span>
                    <Plus size={25} />
                  </span>
                  <strong>A little more knowledge?</strong>
                  <p>Paste text or upload a .txt / .md file</p>
                </button>
              </div>
              <div className="info-strip">
                <Lightbulb size={19} />
                <div>
                  <strong>Try changing the source of truth.</strong>
                  <p>
                    Add a document about a new loan policy, then ask about it in
                    the playground. Watch how the evidence changes the answer.
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("playground")}
                >
                  Open playground <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}
          {page === "experiments" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> TUNE. RUN. UNDERSTAND.
                  </div>
                  <h1>
                    Small changes. New insights<span>.</span>
                  </h1>
                  <p>Experiment with the tradeoffs that shape a RAG system.</p>
                </div>
                <button
                  className="primary"
                  onClick={() => navigate("playground")}
                >
                  <Play size={15} /> Back to playground
                </button>
              </div>
              <div className="experiments-grid">
                <section className="config-card">
                  <div className="section-title">
                    <h2>
                      <Settings2 size={18} /> Pipeline controls
                    </h2>
                  </div>
                  {settingsContent}
                </section>
                <section className="experiment-history">
                  <div className="section-title">
                    <h2>
                      Run history{" "}
                      <span className="subtle-pill">This session</span>
                    </h2>
                  </div>
                  {history.length ? (
                    <div className="history-list">
                      {history.map((r, i) => (
                        <button
                          className="history-card"
                          key={r.id}
                          onClick={() => {
                            resetRun();
                            setRun(r);
                            setQuery(r.query);
                            setConfig(r.config);
                            setProgress(12);
                            setPage("playground");
                            setTab("answer");
                          }}
                        >
                          <div>
                            <span className="run-index">
                              RUN {String(history.length - i).padStart(2, "0")}
                            </span>
                            <span>
                              {new Date(r.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <h3>{r.query}</h3>
                          <div className="history-chips">
                            <span>{r.config.chunkSize}-word chunks</span>
                            <span>Top {r.config.topK}</span>
                            <span>
                              {Math.round(r.config.semanticWeight * 100)}%
                              vector
                            </span>
                            <span>Rerank {r.config.rerank ? "on" : "off"}</span>
                          </div>
                          <div className="history-footer">
                            <strong>
                              {Math.round(r.coverage * 100)}% term coverage
                            </strong>
                            <span>
                              Inspect run <ArrowUpRight size={13} />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="history-empty">
                      <FlaskConical size={35} />
                      <h3>Your experiments start here.</h3>
                      <p>
                        Run a question in the playground, change a setting, and
                        run it again. Your last 20 runs appear here for
                        comparison.
                      </p>
                      <button
                        className="primary"
                        onClick={() => navigate("playground")}
                      >
                        Create your first run <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                  <div className="experiment-tip">
                    <Lightbulb size={18} />
                    <div>
                      <strong>Change one variable at a time.</strong>
                      <p>
                        Try 30-word versus 120-word chunks with the same
                        question. Inspect the retrieved context, then compare
                        how complete the answer feels.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
          {page === "guide" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> A LITTLE LESS MYSTERY
                  </div>
                  <h1>
                    Get to know RAG<span>.</span>
                  </h1>
                  <p>
                    A practical guide to the journey from raw documents to
                    reliable answers.
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => navigate("playground")}
                >
                  Learn by doing <ArrowRight size={16} />
                </button>
              </div>
              <div className="guide-hero">
                <div>
                  <span className="subtle-pill">
                    RETRIEVAL-AUGMENTED GENERATION
                  </span>
                  <h2>Think of it as an open-book exam.</h2>
                  <p>
                    Instead of relying only on what a model remembers, RAG finds
                    relevant information, adds it to the question, and asks the
                    model to answer with that evidence.
                  </p>
                </div>
                <div className="guide-equation">
                  <span>
                    <Search size={25} />
                    <strong>Retrieve</strong>
                  </span>
                  <b>+</b>
                  <span>
                    <Layers3 size={25} />
                    <strong>Augment</strong>
                  </span>
                  <b>=</b>
                  <span>
                    <Sparkles size={25} />
                    <strong>Grounded answers</strong>
                  </span>
                </div>
              </div>
              <div className="simulation-note">
                <FlaskConical size={20} />
                <div>
                  <strong>What is real in this playground?</strong>
                  <p>
                    Document parsing, word-based chunking, BM25, vector cosine
                    similarity, context assembly, and citations all run in your
                    browser. Embeddings use a 96-dimensional feature hash with a
                    small synonym map; reranking uses term coverage; answers
                    extract source sentences. These illustrate production
                    components without a trained embedding model or an LLM.
                    Scores are teaching signals, not measured accuracy. No API
                    keys are needed.
                  </p>
                </div>
              </div>
              <div className="guide-grid">
                {stages.map((stage, i) => {
                  const Icon = icons[i];
                  return (
                    <article
                      className="guide-card"
                      id={`guide-${i}`}
                      key={stage.id}
                    >
                      <div className="guide-card-top">
                        <span className={`node-icon ${stage.color}`}>
                          <Icon size={21} />
                        </span>
                        <span>STEP {String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <h3>{stage.title}</h3>
                      <p>{stage.concept}</p>
                      <div className="production-note">
                        <span>IN A PRODUCTION SYSTEM</span>
                        <p>{stage.production}</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => {
                          setSelected(i);
                          setPage("playground");
                        }}
                      >
                        See it in the pipeline <ArrowUpRight size={14} />
                      </button>
                    </article>
                  );
                })}
              </div>
              <div className="guide-outro">
                <GitBranch size={22} />
                <div>
                  <h3>The workflow keeps going.</h3>
                  <p>
                    Production RAG also needs source syncing, access control,
                    monitoring, caching, evaluation datasets, cost tracking, and
                    human feedback. Use those signals to improve both your
                    knowledge base and your pipeline.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      {inspecting && stageRun && (
        <Modal
          title={`${String(selected + 1).padStart(2, "0")} · ${currentStage.title}`}
          subtitle="Live data from your current documents, question, and pipeline settings."
          onClose={() => setInspecting(false)}
          wide
        >
          <div className="stage-data-intro">
            <StageIcon size={18} />
            <span>{currentStage.input}</span>
            <ArrowRight size={15} />
            <strong>{currentStage.output}</strong>
          </div>
          {selected === 0 && (
            <div className="stage-source-list">
              {documents.map((d) => (
                <article key={d.id}>
                  <h3>
                    <FileText size={16} />
                    {d.title}
                  </h3>
                  <div className="data-metadata">
                    {d.category} · {d.text.split(/\s+/).length} words · id:{" "}
                    {d.id}
                  </div>
                  <p>{d.text}</p>
                </article>
              ))}
            </div>
          )}
          {selected === 1 && (
            <div className="stage-source-list">
              {documents.map((d) => (
                <article key={d.id}>
                  <h3>{d.title}</h3>
                  <div className="parse-comparison">
                    <div>
                      <span>RAW SOURCE</span>
                      <pre>{d.text}</pre>
                    </div>
                    <div>
                      <span>PARSED TEXT</span>
                      <pre>{parseDocument(d.text)}</pre>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {selected === 2 && (
            <>
              <div className="data-summary">
                {chunks.length} chunks · {config.chunkSize}-word windows ·{" "}
                {config.overlap}-word overlap
              </div>
              <div className="chunk-preview">
                {chunks.map((c) => (
                  <div key={c.id}>
                    <span>
                      {c.id}
                      <b>{c.tokens} words</b>
                    </span>
                    <p>{c.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          {selected === 3 && (
            <>
              <div className="data-summary">
                Each row is a chunk. Each square is one of its 96 vector
                dimensions. Darker squares indicate larger values.
              </div>
              <div className="embedding-map">
                {chunks.map((c) => (
                  <div key={c.id}>
                    <span>{c.id}</span>
                    <div>
                      {c.vector.map((v, j) => (
                        <i
                          key={j}
                          title={`Dimension ${j + 1}: ${v.toFixed(4)}`}
                          style={{
                            background: `rgba(121,97,217,${Math.max(0.06, v * 2.5)})`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="simulation-note">
                <Lightbulb size={18} />
                <p>
                  These are normalized feature hashes, not trained neural
                  embeddings. Hover over a dimension to inspect its numerical
                  value. Similar words and known synonyms share dimensions.
                </p>
              </div>
            </>
          )}
          {selected === 4 && (
            <>
              <div className="data-summary">
                An in-memory index connects every vector to its source.
                Retrieval uses an exact cosine scan.
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Chunk ID</th>
                      <th>Source</th>
                      <th>Words</th>
                      <th>Vector dimensions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunks.map((c) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td>{c.title}</td>
                        <td>{c.tokens}</td>
                        <td>{c.vector.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {selected === 5 && (
            <>
              <div className="data-summary">YOUR QUESTION</div>
              <blockquote className="citation-text">{query}</blockquote>
              <div className="data-summary">NORMALIZED SEARCH TERMS</div>
              <div className="token-chips">
                {tokenize(query).map((t, i) => (
                  <span key={i}>{t}</span>
                ))}
              </div>
              <div className="data-summary">
                QUERY VECTOR · FIRST 24 OF 96 DIMENSIONS
              </div>
              <pre className="prompt-code">
                {JSON.stringify(
                  embed(query)
                    .slice(0, 24)
                    .map((v) => +v.toFixed(4)),
                  null,
                  2,
                )}
              </pre>
            </>
          )}
          {(selected === 6 || selected === 7) && (
            <>
              <div className="data-summary">
                {selected === 6
                  ? `Hybrid score = ${config.semanticWeight.toFixed(2)} × cosine similarity + ${(1 - config.semanticWeight).toFixed(2)} × normalized BM25`
                  : `${config.rerank ? "Rerank score = 0.6 × hybrid score + 0.4 × query-term coverage" : "Reranking is disabled; initial hybrid ordering is preserved."} · Top ${config.topK} passages`}
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank / chunk</th>
                      <th>Vector</th>
                      <th>BM25</th>
                      <th>Hybrid</th>
                      <th>Rerank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected === 6
                      ? stageRun.retrieved
                      : stageRun.ranked
                    ).map((c, i) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{i + 1}.</strong> {c.id}
                        </td>
                        <td>{c.semantic.toFixed(3)}</td>
                        <td>{c.lexical.toFixed(3)}</td>
                        <td>{c.score.toFixed(3)}</td>
                        <td>
                          {config.rerank ? c.rerankScore.toFixed(3) : "Off"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!stageRun.ranked.length && (
                <p className="data-summary">
                  No matching passages for this question.
                </p>
              )}
            </>
          )}
          {(selected === 8 || selected === 9) && (
            <pre className="prompt-code">
              {selected === 8
                ? stageRun.context || "No matching context."
                : stageRun.prompt}
            </pre>
          )}
          {selected === 10 && (
            <>
              <div className="data-summary">
                EXTRACTIVE GENERATION · SENTENCES SELECTED FROM THE RETRIEVED
                SOURCES
              </div>
              <div className="document-preview">{stageRun.answer}</div>
              <p className="data-summary">
                A production LLM would synthesize a response from the augmented
                prompt. This local demo selects relevant sentences and attaches
                their source numbers.
              </p>
            </>
          )}
          {selected === 11 && (
            <>
              <div className="evaluation-grid">
                <article>
                  <strong>{Math.round(stageRun.coverage * 100)}%</strong>
                  <span>Query-term coverage</span>
                  <p>
                    Fraction of query terms, including mapped synonyms, found in
                    the context.
                  </p>
                </article>
                <article>
                  <strong>{stageRun.ranked.length}</strong>
                  <span>Evidence passages</span>
                  <p>
                    Selected from {stageRun.retrieved.length} retrieved
                    candidates using your current settings.
                  </p>
                </article>
                <article>
                  <strong>
                    {stageRun.grounded ? "Extracted" : "Abstained"}
                  </strong>
                  <span>Source support</span>
                  <p>
                    {stageRun.grounded
                      ? "Answer sentences are copied from retrieved passages."
                      : "No relevant source sentence was found."}
                  </p>
                </article>
              </div>
              <div className="simulation-note">
                <ShieldCheck size={20} />
                <div>
                  <strong>Grounding is not the same as correctness.</strong>
                  <p>
                    Sources may be outdated, contradictory, or wrong. Real
                    evaluation needs a labeled test set, citation verification,
                    retrieval recall, answer relevance, and human feedback.
                  </p>
                </div>
              </div>
            </>
          )}
        </Modal>
      )}
      {settings && (
        <Modal
          title="Make the pipeline yours"
          subtitle="Adjust a setting, then run the simulation to see what changes."
          onClose={() => setSettings(false)}
        >
          {settingsContent}
          <button
            className="primary full modal-done"
            onClick={() => setSettings(false)}
          >
            Apply to next run <Check size={15} />
          </button>
        </Modal>
      )}
      {adding && (
        <Modal
          title={editingId ? "Edit your knowledge" : "Add a little knowledge"}
          subtitle="Your documents are stored only in this browser."
          onClose={() => setAdding(false)}
        >
          <button
            className="upload-zone"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={23} />
            <strong>
              {editingId
                ? "Replace content with a text or Markdown file"
                : "Choose a text or Markdown file"}
            </strong>
            <span>.txt, .md · up to 200 KB</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown"
            hidden
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="form-divider">
            <span />
            or paste your own text
            <span />
          </div>
          <label className="form-label" htmlFor="document-title">
            Document title
          </label>
          <input
            id="document-title"
            className="form-input"
            value={title}
            maxLength={120}
            placeholder="e.g. Home loan document checklist"
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="form-label" htmlFor="document-body">
            Source content
          </label>
          <textarea
            id="document-body"
            className="form-input source-textarea"
            value={body}
            maxLength={200001}
            placeholder="Paste the information your assistant should know…"
            onChange={(e) => setBody(e.target.value)}
          />
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <button className="primary full" onClick={saveDocument}>
            {editingId ? <Check size={16} /> : <Plus size={16} />}
            {editingId ? "Save document changes" : "Add to knowledge base"}
          </button>
        </Modal>
      )}
      {documentView && (
        <Modal
          title={documentView.title}
          subtitle={`${documentView.category} · ${chunks.filter((c) => c.documentId === documentView.id).length} chunks with current settings`}
          onClose={() => setDocumentView(null)}
          wide
        >
          <div className="document-preview-toolbar">
            <button
              className="secondary"
              onClick={() => openDocumentEditor(documentView)}
            >
              <Pencil size={15} /> Edit document
            </button>
          </div>
          <div className="document-preview">
            {parseDocument(documentView.text)}
          </div>
          <div className="section-title">
            <h2>How it gets chunked</h2>
            <span className="subtle-pill">
              {config.chunkSize} words · {config.overlap} overlap
            </span>
          </div>
          <div className="chunk-preview">
            {chunks
              .filter((c) => c.documentId === documentView.id)
              .map((c, i) => (
                <div key={c.id}>
                  <span>
                    CHUNK {i + 1} <b>{c.tokens} words</b>
                  </span>
                  <p>{c.text}</p>
                  <div
                    className="vector-preview"
                    aria-label="Embedding vector visualization"
                  >
                    {embed(c.text)
                      .slice(0, 48)
                      .map((v, j) => (
                        <i
                          key={j}
                          style={{
                            height: `${Math.max(3, v * 65)}px`,
                            opacity: Math.max(0.15, v * 3),
                          }}
                        />
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </Modal>
      )}
      {citation !== null && run && (
        <Modal
          title={`Source ${citation}: ${run.citations[citation - 1]?.title ?? "Evidence"}`}
          subtitle="The exact passage supplied to the answer generator."
          onClose={() => setCitation(null)}
        >
          <blockquote className="citation-text">
            {run.citations[citation - 1]?.text}
          </blockquote>
          <div className="info-strip compact">
            <ShieldCheck size={18} />
            <p>
              Compare the answer with this passage to check whether the source
              supports the claim.
            </p>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = ref.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([hidden]), textarea, [tabindex="0"]',
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
export default App;
