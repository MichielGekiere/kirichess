"use client";

import { useTranslations } from "next-intl";
import type { ClockEventType } from "@/lib/types";

/** One clock effect of a move: a signed amount, and the event that caused it when known. */
export interface ClockDeltaItem {
  amount: number; // signed seconds
  type?: ClockEventType;
}

/**
 * What the last move did to one clock. `id` changes on every move, including one that left this
 * clock alone, so the digit tint replays on each new move rather than once per distinct value.
 */
export interface ClockDelta {
  id: number;
  items: ClockDeltaItem[];
}

/** Keys into the `replay` namespace, which already names every event for the replay's move log. */
export const EVENT_LABEL_KEY: Record<ClockEventType, string> = {
  CaptureGain: "eventCaptureGain",
  CaptureLoss: "eventCaptureLoss",
  MovementToll: "eventMovementToll",
  CheckGain: "eventCheckGain",
  CheckLoss: "eventCheckLoss",
  PromotionCost: "eventPromotionCost",
  CastleCost: "eventCastleCost",
  Increment: "eventIncrement",
  RepetitionNullified: "eventRepetitionNullified",
  FlagFall: "eventFlagFall",
};

/**
 * A zero-amount event says nothing on a clock, with one exception: a nullified repetition is the
 * reason a move cost nothing, which is exactly what a player looking at an unchanged clock wants to
 * know. Flag fall is already the clock's own red "time!" label.
 */
function isShown(item: ClockDeltaItem): boolean {
  if (item.type === "FlagFall") return false;
  return item.amount !== 0 || item.type === "RepetitionNullified";
}

/** Net seconds the move put on (or took off) this clock; drives the digit tint. */
export function netDelta(delta: ClockDelta | null | undefined): number {
  if (!delta) return 0;
  return delta.items.reduce((sum, item) => sum + item.amount, 0);
}

/** The tint class for a clock's digits after a move, or "" when the move left the clock even. */
export function deltaTintClass(delta: ClockDelta | null | undefined): string {
  const net = netDelta(delta);
  if (net > 0) return "clock-tint-gain";
  if (net < 0) return "clock-tint-loss";
  return "";
}

function formatAmount(amount: number): string {
  // U+2212, not a hyphen: the minus has to be as wide as the plus or the column shifts.
  return `${amount > 0 ? "+" : "−"}${Math.abs(amount)}s`;
}

interface ClockDeltaLineProps {
  delta: ClockDelta | null | undefined;
  className?: string;
}

/**
 * The last move's effect on one clock, as a line inside the clock card: `−2s Movement toll`. It
 * replaces the old floating `+Ns` popup, which drew over the digits it was explaining and was gone
 * in about a second. This stays put until the next move, so it can be read whenever the player
 * looks up from the board.
 *
 * Hidden from assistive tech: the game page already speaks the same economy in its move
 * announcement (`describeMove`), and reading it again from the clock would say it twice.
 */
export function ClockDeltaLine({ delta, className = "" }: ClockDeltaLineProps) {
  const t = useTranslations("replay");
  const items = delta ? delta.items.filter(isShown) : [];

  return (
    <div
      aria-hidden="true"
      className={`flex min-h-5 flex-wrap gap-x-3 text-sm leading-5 ${className}`}
    >
      {items.map((item, i) => (
        <span
          key={`${delta?.id}-${i}`}
          className="clock-delta-in whitespace-nowrap"
        >
          {item.amount !== 0 && (
            <span
              className={`font-semibold tabular-nums ${
                item.amount > 0 ? "text-gain" : "text-loss"
              }`}
            >
              {formatAmount(item.amount)}
            </span>
          )}
          {item.type && (
            <span className={`text-muted ${item.amount !== 0 ? "ml-1" : ""}`}>
              {t(EVENT_LABEL_KEY[item.type])}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
