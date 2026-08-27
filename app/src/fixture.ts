import {
  STUDY_SCHEMA_VERSION,
  createSession,
  type AxisDefinition,
  type Candidate,
  type Face,
  type Recipe,
  type RecipePack,
  type SourceSummary,
  type StudyDocument,
  type StudySession,
} from "./domain.js";

const recipeSeeds: Record<Exclude<RecipePack, "blank">, readonly Omit<Recipe, "id" | "pack">[]> = {
  "film-tv": [
    { name: "Title slide", copy: "A House With No Doors", language: "en", direction: "auto", casing: "exact", sizePolicy: "fit", size: 96, lineHeight: 0.94, tracking: -0.035, alignment: "leading", background: "ink", lineLimit: 3 },
    { name: "Logline", copy: "A family inherits a beautiful home that refuses to let them leave.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fit", size: 38, lineHeight: 1.08, tracking: -0.012, alignment: "leading", background: "paper", lineLimit: 4 },
    { name: "Character bio", copy: "Mara has spent twenty years making exits for everyone except herself. The house notices.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fixed", size: 25, lineHeight: 1.28, tracking: -0.004, alignment: "leading", background: "paper" },
    { name: "Section divider", copy: "THE HOUSE", language: "en", direction: "auto", casing: "uppercase", sizePolicy: "fit", size: 72, lineHeight: 1, tracking: 0.08, alignment: "center", background: "split", lineLimit: 2 },
    { name: "Caption", copy: "Exterior, dusk — the first night", language: "en", direction: "auto", casing: "exact", sizePolicy: "fixed", size: 16, lineHeight: 1.2, tracking: 0.01, alignment: "leading", background: "paper", lineLimit: 2 },
    { name: "Legal", copy: "Confidential. For discussion purposes only.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fixed", size: 10, lineHeight: 1.2, tracking: 0.015, alignment: "leading", background: "ink", lineLimit: 2 },
  ],
  advertising: [
    { name: "Campaign line", copy: "MAKE ROOM FOR STRANGE.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fit", size: 92, lineHeight: 0.92, tracking: -0.03, alignment: "leading", background: "ink", lineLimit: 3 },
    { name: "Director statement", copy: "We begin in the familiar, then let one impossible detail contaminate every frame.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fixed", size: 28, lineHeight: 1.22, tracking: -0.008, alignment: "leading", background: "paper" },
    { name: "Treatment paragraph", copy: "The camera stays curious rather than impressed. Texture comes from practical light, imperfect surfaces, and people moving at human speed.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fixed", size: 22, lineHeight: 1.32, tracking: 0, alignment: "leading", background: "paper" },
    { name: "End card", copy: "NOTHING ORDINARY", language: "en", direction: "auto", casing: "uppercase", sizePolicy: "fit", size: 68, lineHeight: 1, tracking: 0.04, alignment: "center", background: "split", lineLimit: 2 },
    { name: "Supers", copy: "Available now · Terms apply", language: "en", direction: "auto", casing: "exact", sizePolicy: "fixed", size: 18, lineHeight: 1.15, tracking: 0.01, alignment: "center", background: "ink", lineLimit: 2 },
    { name: "Legal", copy: "Offer valid while stocks last. See full terms.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fixed", size: 9, lineHeight: 1.2, tracking: 0.012, alignment: "leading", background: "paper" },
  ],
  business: [
    { name: "Company title", copy: "Proof, not promise.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fit", size: 88, lineHeight: 0.96, tracking: -0.035, alignment: "leading", background: "ink", lineLimit: 3 },
    { name: "Value proposition", copy: "A calmer way to turn complex work into decisions people can act on.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fit", size: 40, lineHeight: 1.08, tracking: -0.014, alignment: "leading", background: "paper", lineLimit: 5 },
    { name: "Problem", copy: "Teams lose weeks rebuilding the same context across documents, meetings, and tools.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fixed", size: 26, lineHeight: 1.24, tracking: -0.004, alignment: "leading", background: "paper" },
    { name: "Metric", copy: "$12.4M\nARR", language: "en", direction: "auto", casing: "exact", sizePolicy: "fit", size: 104, lineHeight: 0.86, tracking: -0.045, alignment: "leading", background: "split", lineLimit: 2 },
    { name: "Team bio", copy: "Built by operators who have lived the problem from both sides of the table.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fixed", size: 20, lineHeight: 1.3, tracking: 0, alignment: "leading", background: "paper" },
    { name: "Legal", copy: "Illustrative figures. Confidential and not for redistribution.", language: "en", direction: "auto", casing: "exact", sizePolicy: "fixed", size: 10, lineHeight: 1.2, tracking: 0.012, alignment: "leading", background: "ink" },
  ],
};

export function recipesForPack(pack: RecipePack): Recipe[] {
  if (pack === "blank") {
    return [
      {
        id: "recipe:blank:custom",
        pack,
        name: "Custom specimen",
        copy: "Type carries the argument before a word is read.",
        language: "en",
        direction: "auto",
        casing: "exact",
        sizePolicy: "fit",
        size: 72,
        lineHeight: 1.04,
        tracking: -0.02,
        alignment: "leading",
        background: "split",
      },
    ];
  }
  return recipeSeeds[pack].map((recipe, index) => ({ ...recipe, id: `recipe:${pack}:${index + 1}`, pack }));
}

export function createNewStudy(pack: RecipePack = "film-tv", title = "Untitled font study"): StudySession {
  const now = new Date().toISOString();
  const document: StudyDocument = {
    schemaVersion: STUDY_SCHEMA_VERSION,
    id: `study:${globalThis.crypto.randomUUID()}`,
    title,
    createdAt: now,
    updatedAt: now,
    sources: [],
    faces: [],
    candidates: [],
    recipes: recipesForPack(pack),
    comparisonSets: [],
    typographySystems: [{ id: "system:primary", name: "Primary system", rationale: "", fontUses: [] }],
    activeSystemId: "system:primary",
    handoff: { profile: "designer", outputs: ["pdf", "summary", "json", "csv"], includeSources: true },
  };
  return createSession(document);
}

const familySeeds = [
  { id: "aperture", family: "Aperture Sans", category: "sans", variable: true },
  { id: "ledger", family: "Ledger Serif", category: "serif", variable: false },
  { id: "vector", family: "Vector Grotesk", category: "display", variable: true },
  { id: "signal", family: "Signal Mono", category: "mono", variable: false },
] as const;
const styles = ["Light", "Regular", "Medium", "Semibold", "Bold", "Black"] as const;
const decisions = ["unreviewed", "keep", "unreviewed", "maybe", "reject", "unreviewed"] as const;
const weightAxis: AxisDefinition = { tag: "wght", name: "Weight", minimum: 200, defaultValue: 400, maximum: 900 };
const widthAxis: AxisDefinition = { tag: "wdth", name: "Width", minimum: 75, defaultValue: 100, maximum: 125 };

export function createFixtureSession(): StudySession {
  const now = "2026-08-27T00:00:00.000Z";
  const sources: SourceSummary[] = familySeeds.map((seed) => ({
    id: `source:fixture:${seed.id}`,
    displayName: `${seed.family} source`,
    hint: { fileName: `${seed.id}.ttf`, format: "TTF", faceCount: seed.variable ? 1 : 6 },
    lastKnownState: seed.id === "signal" ? "missing" : "readable",
  }));
  const faces: Face[] = familySeeds.flatMap<Face>((seed, familyIndex): Face[] =>
    seed.variable
      ? [
          {
            id: `face:fixture:${seed.id}:0`,
            sourceId: `source:fixture:${seed.id}`,
            family: seed.family,
            style: "Variable",
            postScriptName: `${seed.family.replaceAll(" ", "")}-Variable`,
            faceIndex: 0,
            axes: [weightAxis, widthAxis],
            namedInstances: styles.map((style, index) => ({
              name: style,
              coordinates: [
                { tag: "wght", value: [300, 400, 500, 600, 700, 900][index] },
                { tag: "wdth", value: familyIndex === 0 ? 100 : 92 },
              ],
            })),
            features: [
              { tag: "liga", name: "Standard ligatures", group: "ligatures", defaultEnabled: true },
              { tag: "ss01", name: "Stylistic set 1", group: "stylistic", defaultEnabled: false },
              { tag: "tnum", name: "Tabular figures", group: "figures", defaultEnabled: false },
            ],
            coverage: { supportedCodePointCount: 612, scripts: ["Latin"], colorFormats: [], evidenceLevel: "metadata" },
          },
        ]
      : styles.map((style, index) => ({
          id: `face:fixture:${seed.id}:${index}`,
          sourceId: `source:fixture:${seed.id}`,
          family: seed.family,
          style,
          postScriptName: `${seed.family.replaceAll(" ", "")}-${style}`,
          faceIndex: index,
          axes: [],
          namedInstances: [],
          features: [
            { tag: "liga", name: "Standard ligatures", group: "ligatures", defaultEnabled: true },
            { tag: "onum", name: "Oldstyle figures", group: "figures", defaultEnabled: false },
          ],
          coverage: { supportedCodePointCount: 488, scripts: ["Latin"], colorFormats: [], evidenceLevel: "metadata" },
        })),
  );
  const candidates: Candidate[] = familySeeds.flatMap((seed, familyIndex) =>
    styles.map((style, styleIndex) => ({
      id: `candidate:fixture:${seed.id}:${styleIndex}`,
      faceId: seed.variable ? `face:fixture:${seed.id}:0` : `face:fixture:${seed.id}:${styleIndex}`,
      label: style,
      reviewState: decisions[(familyIndex + styleIndex) % decisions.length],
      axes: seed.variable
        ? [
            { tag: "wght", value: [300, 400, 500, 600, 700, 900][styleIndex] },
            { tag: "wdth", value: familyIndex === 0 ? 100 : 92 },
          ]
        : [],
      features: [{ tag: "liga", enabled: true }],
      casing: "exact",
      tags: styleIndex === 0 ? ["quiet"] : styleIndex === 5 ? ["impact"] : [],
      notes: "",
      rationale: "",
      provenance: { kind: "import" },
    })),
  );
  const document: StudyDocument = {
    schemaVersion: STUDY_SCHEMA_VERSION,
    id: "study:fixture:bauhaus-thesis",
    title: "Bauhaus Thesis",
    createdAt: now,
    updatedAt: now,
    sources,
    faces,
    candidates,
    recipes: recipesForPack("film-tv"),
    comparisonSets: [
      {
        id: "comparison:fixture:shortlist",
        name: "Title shortlist",
        candidateIds: ["candidate:fixture:aperture:1", "candidate:fixture:ledger:1", "candidate:fixture:vector:3"],
        recipeId: "recipe:film-tv:1",
        policy: "nominal",
        blind: false,
        blindSeed: "bauhaus",
        revealed: true,
        rationale: "Three distinct voices for the opening title.",
      },
    ],
    typographySystems: [
      {
        id: "system:primary",
        name: "Primary system",
        rationale: "Editorial contrast with a quiet utility voice.",
        fontUses: [
          { id: "font-use:fixture:body", role: "body", faceId: "face:fixture:ledger:1", originatingCandidateId: "candidate:fixture:ledger:1", axes: [], features: [{ tag: "liga", enabled: true }], casing: "exact", tracking: 0, language: "en", direction: "auto", rationale: "Warm long-form reading." },
          { id: "font-use:fixture:utility", role: "utility", faceId: "face:fixture:signal:1", originatingCandidateId: "candidate:fixture:signal:1", axes: [], features: [{ tag: "liga", enabled: true }], casing: "uppercase", tracking: 0.04, language: "en", direction: "auto", rationale: "Technical evidence and labels." },
        ],
      },
    ],
    activeSystemId: "system:primary",
    handoff: { profile: "designer", outputs: ["review-png", "compare-png", "system-png", "pdf", "summary", "json", "csv"], includeSources: false },
    extensions: { fixtureCategories: Object.fromEntries(familySeeds.map((seed) => [seed.id, seed.category])) },
  };
  return createSession(
    document,
    sources.map((source) => ({
      sourceId: source.id,
      state: source.lastKnownState,
      rendererSupport: source.lastKnownState === "missing" ? "unsupported" : "full",
    })),
    {
      selectedCandidateId: "candidate:fixture:aperture:0",
      activeRecipeId: "recipe:film-tv:1",
      trayIds: ["candidate:fixture:aperture:1", "candidate:fixture:ledger:1", "candidate:fixture:vector:3"],
      activeComparisonId: "comparison:fixture:shortlist",
    },
  );
}
