import {
  assertStudySession,
  type Candidate,
  type Face,
  type SourceBindingSummary,
  type SourceSummary,
  type StudySession,
} from "./domain.js";

const sourceFamilies = [
  { id: "source:aperture", family: "Aperture Sans", variable: true },
  { id: "source:ledger", family: "Ledger Serif", variable: false },
  { id: "source:vector", family: "Vector Grotesk", variable: true },
  { id: "source:signal", family: "Signal Mono", variable: false },
] as const;

const styles = ["Light", "Regular", "Medium", "Semibold", "Bold", "Black"] as const;
const reviewPattern = ["unreviewed", "keep", "unreviewed", "maybe", "reject", "unreviewed"] as const;

const sources: SourceSummary[] = sourceFamilies.flatMap((entry) => [
  {
    id: entry.id,
    displayName: `${entry.family} source`,
  },
]);

const bindings: SourceBindingSummary[] = sourceFamilies.map((entry) => ({
  sourceId: entry.id,
  state: entry.id === "source:signal" ? "missing" : "available",
}));

const faces: Face[] = sourceFamilies.flatMap<Face>((entry, familyIndex): Face[] =>
  entry.variable
    ? [
        {
          id: `face:${familyIndex + 1}:variable`,
          sourceId: entry.id,
          family: entry.family,
          style: "Variable",
          faceIndex: 0,
        },
      ]
    : styles.map((style, styleIndex) => ({
        id: `face:${familyIndex + 1}:${styleIndex + 1}`,
        sourceId: entry.id,
        family: entry.family,
        style,
        faceIndex: styleIndex,
      })),
);

const candidates: Candidate[] = sourceFamilies.flatMap((entry, familyIndex) =>
  styles.map((style, styleIndex) => ({
    id: `candidate:${familyIndex + 1}:${styleIndex + 1}`,
    faceId: entry.variable
      ? `face:${familyIndex + 1}:variable`
      : `face:${familyIndex + 1}:${styleIndex + 1}`,
    label: style,
    reviewState: reviewPattern[(styleIndex + familyIndex) % reviewPattern.length],
    axes: entry.variable
      ? [
          { tag: "wght", value: [300, 400, 500, 600, 700, 900][styleIndex] },
          { tag: "wdth", value: familyIndex === 0 ? 100 : 92 },
        ]
      : [],
    tags: styleIndex === 0 ? ["quiet"] : styleIndex === 5 ? ["impact"] : [],
  })),
);

export function createFixtureSession(): StudySession {
  return assertStudySession({
    schemaVersion: 0,
    id: "study:p1-bauhaus-thesis",
    title: "Bauhaus Thesis",
    stage: "review",
    sources,
    bindings,
    faces,
    candidates,
    fontUses: [
      {
        id: "font-use:text",
        role: "text",
        faceId: "face:2:2",
        originatingCandidateId: "candidate:2:2",
        axes: [],
      },
      {
        id: "font-use:mono",
        role: "mono",
        faceId: "face:4:2",
        originatingCandidateId: "candidate:4:2",
        axes: [],
      },
    ],
    recipes: [
      {
        id: "recipe:headline",
        name: "Editorial headline",
        copy: "Form follows attention.",
        size: 88,
        tracking: -2,
      },
      {
        id: "recipe:statement",
        name: "Exhibition statement",
        copy: "Type carries the argument before a word is read.",
        size: 44,
        tracking: -1,
      },
      {
        id: "recipe:caption",
        name: "Object caption",
        copy: "Study 04 — weight, rhythm, interval, restraint.",
        size: 22,
        tracking: 0,
      },
    ],
    activeRecipeId: "recipe:headline",
    selectedCandidateId: "candidate:1:1",
    trayIds: ["candidate:1:2", "candidate:2:2", "candidate:3:4"],
    copy: "Form follows attention.",
    revision: 0,
  });
}
