export type ID = string;
export type StudyID = ID;
export type SourceID = ID;
export type FaceID = ID;
export type CandidateID = ID;
export type RecipeID = ID;
export type ComparisonSetID = ID;
export type TypographySystemID = ID;
export type FontUseID = ID;

export type ReviewState = "unreviewed" | "keep" | "maybe" | "reject";
export type ReviewProvenance = "user" | "legacy";

export type FontRole =
  | "display"
  | "body"
  | "data"
  | "caption"
  | "legal"
  | "utility"
  | "fallback";

export interface PortableSourceHint {
  id: SourceID;
  displayName: string;
  fileName: string;
  relativePath?: string;
  formatHint?: string;
  byteLengthHint?: number;
  modifiedAtHint?: string;
  collectionFaceCountHint?: number;
}

export interface VariationAxisSnapshot {
  id: string;
  tag: string;
  name: string;
  minimum: number;
  defaultValue: number;
  maximum: number;
}

export interface FaceMetadataSnapshot {
  familyName: string;
  styleName: string;
  postScriptName?: string;
  fullName?: string;
  format: string;
  faceIndex: number;
  axes: VariationAxisSnapshot[];
  featureTags: string[];
  glyphCountHint?: number;
}

export interface PortableFaceRef {
  id: FaceID;
  sourceID: SourceID;
  faceIndex: number;
  metadata: FaceMetadataSnapshot;
}

export interface CandidateSettings {
  axisValues: Record<string, number>;
  featureValues: Record<string, number | boolean>;
  casing?: "exact" | "upper" | "lower" | "title" | "ap-title";
}

export interface Candidate {
  id: CandidateID;
  faceID: FaceID;
  label?: string;
  settings: CandidateSettings;
  review: {
    state: ReviewState;
    provenance: ReviewProvenance;
    decidedAt?: string;
  };
  tags: string[];
  notes?: string;
  rationale?: string;
  createdAt: string;
}

export type SizePolicy =
  | { kind: "nominal"; pointSize: number }
  | {
      kind: "fit";
      minimumPointSize: number;
      maximumPointSize: number;
      maxLines?: number;
    };

export interface SpecimenRecipe {
  id: RecipeID;
  name: string;
  pack?: "film-tv" | "advertising" | "business" | "custom";
  copy: string;
  language?: string;
  direction: "auto" | "ltr" | "rtl";
  casing: "exact" | "upper" | "lower" | "title" | "ap-title";
  alignment: "leading" | "center" | "trailing" | "justified";
  sizePolicy: SizePolicy;
  trackingEm: number;
  lineHeight: number;
  background: "dark" | "light" | "split";
  authoredLineBreaks: boolean;
  axisPolicy: "candidate" | "recipe";
  axisValues: Record<string, number>;
  featurePolicy: "candidate" | "recipe";
  featureValues: Record<string, number | boolean>;
  metadataPolicy: "none" | "minimal" | "full";
}

export interface ComparisonSet {
  id: ComparisonSetID;
  name: string;
  candidateIDs: CandidateID[];
  recipeID: RecipeID;
  policy: "equal-nominal" | "equal-fit" | "locked-lines";
  background: "dark" | "light" | "split";
  blind?: {
    seed: string;
    revealedAt?: string;
  };
  rationale?: string;
}

export interface FontUse {
  id: FontUseID;
  role: FontRole;
  faceID: FaceID;
  originatingCandidateID?: CandidateID;
  settings: CandidateSettings & {
    trackingEm?: number;
    language?: string;
    direction?: "auto" | "ltr" | "rtl";
  };
  recipeIDs: RecipeID[];
  rationale?: string;
}

export interface TypographySystem {
  id: TypographySystemID;
  name: string;
  fontUses: FontUse[];
  rationale?: string;
}

export interface SystemSceneState {
  id: ID;
  sceneDefinitionID: string;
  sceneDefinitionVersion: number;
  typographySystemID: TypographySystemID;
  recipeBindings: Record<string, RecipeID>;
  enabled: boolean;
  rationale?: string;
}

export interface StudyFinding {
  id: ID;
  severity: "blocker" | "caution" | "note";
  code: string;
  subjectID?: ID;
  message: string;
  acknowledgedAt?: string;
  rationale?: string;
}

export interface HandoffProfile {
  id: ID;
  name: string;
  requiredRoles: FontRole[];
  outputs: Array<
    | "summary"
    | "review-boards"
    | "compare-boards"
    | "system-scenes"
    | "pdf"
    | "json"
    | "csv"
    | "figma-reference"
    | "source-copies"
  >;
}

export interface StudyDocumentV4 {
  schemaVersion: 4;
  studyID: StudyID;
  title: string;
  createdAt: string;
  updatedAt: string;

  sources: PortableSourceHint[];
  faces: PortableFaceRef[];
  candidates: Candidate[];
  recipes: SpecimenRecipe[];
  comparisons: ComparisonSet[];
  systems: TypographySystem[];
  activeSystemID?: TypographySystemID;
  systemScenes: SystemSceneState[];
  findings: StudyFinding[];
  handoffProfiles: HandoffProfile[];

  provenance: {
    createdByVersion: string;
    lastSavedByVersion: string;
    lastSavedByPlatform: "mac" | "linux";
  };

  extensions?: Record<string, unknown>;
}
