import type { Icon, IconWeight } from "@phosphor-icons/react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/icons/ArrowCounterClockwise";
import { ArrowDown } from "@phosphor-icons/react/dist/icons/ArrowDown";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { ArrowUpRight } from "@phosphor-icons/react/dist/icons/ArrowUpRight";
import { Books } from "@phosphor-icons/react/dist/icons/Books";
import { CaretDown } from "@phosphor-icons/react/dist/icons/CaretDown";
import { CaretRight } from "@phosphor-icons/react/dist/icons/CaretRight";
import { Check } from "@phosphor-icons/react/dist/icons/Check";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { Circle } from "@phosphor-icons/react/dist/icons/Circle";
import { DownloadSimple } from "@phosphor-icons/react/dist/icons/DownloadSimple";
import { Equals } from "@phosphor-icons/react/dist/icons/Equals";
import { FloppyDisk } from "@phosphor-icons/react/dist/icons/FloppyDisk";
import { FolderOpen } from "@phosphor-icons/react/dist/icons/FolderOpen";
import { GridFour } from "@phosphor-icons/react/dist/icons/GridFour";
import { Minus } from "@phosphor-icons/react/dist/icons/Minus";
import { Paragraph } from "@phosphor-icons/react/dist/icons/Paragraph";
import { Plus } from "@phosphor-icons/react/dist/icons/Plus";
import { Question } from "@phosphor-icons/react/dist/icons/Question";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/icons/SlidersHorizontal";
import { SpinnerGap } from "@phosphor-icons/react/dist/icons/SpinnerGap";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import { X } from "@phosphor-icons/react/dist/icons/X";

export type InterfaceIconName =
  | "add"
  | "arrow-down"
  | "arrow-left"
  | "arrow-right"
  | "arrow-up-right"
  | "body-copy"
  | "boards"
  | "caret-down"
  | "caret-right"
  | "equal"
  | "export"
  | "folder"
  | "library"
  | "relink"
  | "remove"
  | "review-keep"
  | "review-maybe"
  | "review-reject"
  | "review-unreviewed"
  | "save"
  | "source-ready"
  | "source-warning"
  | "spinner"
  | "subtract"
  | "tune";

const icons: Readonly<Record<InterfaceIconName, Icon>> = {
  add: Plus,
  "arrow-down": ArrowDown,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  "body-copy": Paragraph,
  boards: GridFour,
  "caret-down": CaretDown,
  "caret-right": CaretRight,
  equal: Equals,
  export: DownloadSimple,
  folder: FolderOpen,
  library: Books,
  relink: ArrowCounterClockwise,
  remove: X,
  "review-keep": Check,
  "review-maybe": Question,
  "review-reject": X,
  "review-unreviewed": Circle,
  save: FloppyDisk,
  "source-ready": CheckCircle,
  "source-warning": WarningCircle,
  spinner: SpinnerGap,
  subtract: Minus,
  tune: SlidersHorizontal,
};

const weights: Partial<Readonly<Record<InterfaceIconName, IconWeight>>> = {
  "arrow-down": "bold",
  "arrow-left": "bold",
  "arrow-right": "bold",
  "arrow-up-right": "bold",
  "caret-down": "bold",
  "caret-right": "bold",
  equal: "bold",
  remove: "bold",
  "review-keep": "bold",
  "review-maybe": "bold",
  "review-reject": "bold",
  "review-unreviewed": "bold",
  "source-ready": "fill",
  "source-warning": "fill",
  subtract: "bold",
};

export function InterfaceIcon({
  name,
  size = 20,
  weight,
}: {
  readonly name: InterfaceIconName;
  readonly size?: number;
  readonly weight?: IconWeight;
}) {
  const PhosphorIcon = icons[name];
  return (
    <PhosphorIcon
      aria-hidden="true"
      className={`interface-icon interface-icon-${name}`}
      focusable="false"
      size={size}
      weight={weight ?? weights[name] ?? "regular"}
    />
  );
}
