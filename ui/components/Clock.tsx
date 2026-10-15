"use client";

import { useTranslations } from "next-intl";
import { spokenTime } from "@/lib/a11y";
import type { Side } from "@/lib/types";
import {
  ClockDeltaLine,
  deltaTintClass,
  type ClockDelta,
} from "@/components/ClockDeltaLine";

interface ClockProps {
  side: Side;
  seconds: number;
  active: boolean;
  /** The last move's effect on this clock, shown under the digits. Omitted where there is none (replay, spectating). */
  delta?: ClockDelta | null;
  /**
   * `full` (default) is the original stacked face at every width. `compact` is a
   * horizontal bar with text-3xl digits below lg, and the original stacked
   * face at lg and up, so one instance can sit against the board on a phone
   * and in the sidebar on a desktop.
   */
  variant?: "full" | "compact";
  /**
   * P-4-8. The cosmetic ticker is frozen because the hub is not connected. Digits stay at the last
   * known reading and go muted, including a zero that would otherwise render the red Flagged label.
   * A moving clock is the strongest "still live" cue; greying a stopped one is the tell.
   */
  frozen?: boolean;
}

/**
 * Below this many seconds remaining, the clock also shows tenths (the time-scramble convention
 * both reference sites use); at or above it, whole seconds only. Tenths render as a smaller
 * glyph so `0:19.9` still fits the 240px sidebar column at the stacked face size.
 */
const URGENT_THRESHOLD_SECONDS = 20;

function formatTime(totalSeconds: number): {
  main: string;
  tenths: string | null;
} {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  if (clamped < URGENT_THRESHOLD_SECONDS) {
    // Floor to a tenth, same "never show more time than truly remains" rule the whole-second
    // path already applies, just at one more decimal of precision.
    const whole = Math.floor(clamped % 60);
    const tenth = Math.floor((clamped % 60) * 10) % 10;
    return {
      main: `${minutes}:${whole.toString().padStart(2, "0")}`,
      tenths: `.${tenth}`,
    };
  }
  const seconds = Math.floor(clamped % 60);
  return {
    main: `${minutes}:${seconds.toString().padStart(2, "0")}`,
    tenths: null,
  };
}

export function Clock({
  side,
  seconds,
  active,
  delta = null,
  variant = "full",
  frozen = false,
}: ClockProps) {
  const t = useTranslations("Clock");
  const tA11y = useTranslations("a11y");
  const flagged = seconds <= 0 && !frozen;
  const liveActive = active && !frozen;
  const sideLabel = side === "White" ? t("white") : t("black");
  const compact = variant === "compact";
  // P-5-5: the visible M:SS reads as a date to a screen reader. Name the group with spokenTime
  // (browse-mode users get a real duration) and hide the digits so they are not double-read. The
  // `c` key on AccessibleBoard still supplies the you/opponent/gap framing.
  const accessibleName = flagged
    ? `${sideLabel}, ${spokenTime(seconds, tA11y)}, ${t("flagged")}`
    : `${sideLabel}, ${spokenTime(seconds, tA11y)}`;
  const { main, tenths } = formatTime(seconds);
  const digitColor = flagged
    ? "text-[var(--loss)]"
    : liveActive
      ? "text-white"
      : "text-muted";

  return (
    <div
      role="group"
      aria-label={accessibleName}
      className={`relative overflow-hidden border text-center transition-colors bg-[var(--surface)] ${
        compact
          ? "grid grid-cols-[auto_1fr] items-center gap-x-3 px-4 py-2 lg:block lg:px-4 lg:py-4"
          : "px-4 py-4"
      } ${
        liveActive
          ? "border-[var(--bounty)] shadow-[0_0_30px_-5px_color-mix(in_srgb,var(--bounty)_40%,transparent)]"
          : "border-[var(--border)]"
      }`}
    >
      {/* Compact below lg is a two-row grid: side label over the delta line on the left, digits
          spanning both rows on the right. At lg the parent turns back into a block and the DOM
          order (label, digits, delta) is the stacked face, so the grid placement goes inert. */}
      <div
        aria-hidden="true"
        className={`text-sm font-semibold uppercase tracking-widest text-muted ${
          compact ? "col-start-1 row-start-1 text-left lg:text-center" : ""
        }`}
      >
        {sideLabel}
      </div>
      <div
        className={
          compact
            ? "col-start-2 row-span-2 row-start-1 flex flex-col items-end lg:block"
            : ""
        }
      >
        <div
          key={delta?.id}
          aria-hidden="true"
          className={`${deltaTintClass(delta)} flex items-baseline font-mono font-black tabular-nums leading-none ${
            compact
              ? "justify-end text-3xl lg:mt-1 lg:justify-center lg:text-5xl"
              : "mt-1 justify-center text-5xl"
          } ${digitColor}`}
        >
          <span>{main}</span>
          {tenths !== null && (
            <span
              className={
                compact ? "text-lg font-bold lg:text-2xl" : "text-2xl font-bold"
              }
            >
              {tenths}
            </span>
          )}
        </div>
        {flagged && (
          <div
            aria-hidden="true"
            className={`text-sm font-semibold text-[var(--loss)] ${
              compact ? "lg:mt-1" : "mt-1"
            }`}
          >
            {t("flagged")}
          </div>
        )}
      </div>
      <ClockDeltaLine
        delta={delta}
        className={
          compact
            ? "col-start-1 row-start-2 justify-start lg:mt-1 lg:justify-center"
            : "mt-1 justify-center"
        }
      />
    </div>
  );
}
