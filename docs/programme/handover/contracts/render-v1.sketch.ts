export interface RenderRequestV1 {
  version: 1;
  renderID: string;
  profileID: string;

  fonts: Record<string, RenderFontResource>;
  scene: SceneDefinition;

  target: {
    width: number;
    height: number;
    scale: number;
    format: "png" | "pdf";
    quality: "preview" | "final";
  };

  evidence: "none" | "summary" | "full";
  cancellationToken: string;
}

export interface RenderFontResource {
  sourceCapability: string;
  faceIndex: number;
  axisValues: Record<string, number>;
  featureValues: Record<string, number | boolean>;
  language?: string;
  direction?: "auto" | "ltr" | "rtl";
}

export interface SceneDefinition {
  sceneVersion: number;
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  elements: Array<{
    id: string;
    fontResourceID: string;
    frame: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    text: string;
    sizePolicy:
      | { kind: "nominal"; pointSize: number }
      | {
          kind: "fit";
          minimumPointSize: number;
          maximumPointSize: number;
          maxLines?: number;
        };
    alignment: "leading" | "center" | "trailing" | "justified";
    trackingEm: number;
    lineHeight: number;
    authoredLineBreaks: boolean;
  }>;
}

export interface RenderResultV1 {
  version: 1;
  renderID: string;

  profile: {
    id: string;
    engine: string;
    engineVersion?: string;
    platform: "mac" | "linux";
  };

  assetCapability: string;
  dimensions: {
    width: number;
    height: number;
    scale: number;
  };

  evidence?: {
    fittedPointSizes?: Record<string, number>;
    lines?: Array<{
      elementID: string;
      textRange: [number, number];
      bounds: [number, number, number, number];
    }>;
    fallbackRuns?: Array<{
      elementID: string;
      textRange: [number, number];
      faceName: string;
    }>;
    missingScalars?: Array<{
      elementID: string;
      scalars: number[];
    }>;
    glyphCounts?: Record<string, number>;
  };

  warnings: Array<{
    code: string;
    message: string;
  }>;

  timing: {
    totalMs: number;
    cache: "hit" | "miss";
  };
}
