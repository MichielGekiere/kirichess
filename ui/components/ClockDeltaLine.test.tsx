import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import {
  ClockDeltaLine,
  deltaTintClass,
  netDelta,
  type ClockDelta,
} from "./ClockDeltaLine";
import { Clock } from "./Clock";

function renderLine(delta: ClockDelta | null) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ClockDeltaLine delta={delta} />
    </NextIntlClientProvider>,
  );
}

describe("ClockDeltaLine", () => {
  it("shows each signed amount with its translated event label", () => {
    renderLine({
      id: 1,
      items: [
        { amount: -2, type: "MovementToll" },
        { amount: 5, type: "CaptureGain" },
      ],
    });
    expect(screen.getByText("−2s")).toHaveClass("text-loss");
    expect(screen.getByText("Movement toll")).toHaveClass("text-muted");
    expect(screen.getByText("+5s")).toHaveClass("text-gain");
    expect(screen.getByText("Capture bounty")).toBeInTheDocument();
  });

  it("shows an amount alone when the event type is not known", () => {
    renderLine({ id: 1, items: [{ amount: -3 }] });
    expect(screen.getByText("−3s")).toBeInTheDocument();
  });

  it("drops zero-amount events and flag fall, but keeps a nullified repetition", () => {
    renderLine({
      id: 1,
      items: [
        { amount: 0, type: "MovementToll" },
        { amount: 0, type: "FlagFall" },
        { amount: 0, type: "RepetitionNullified" },
      ],
    });
    expect(screen.queryByText("Movement toll")).toBeNull();
    expect(screen.queryByText("Flag fell")).toBeNull();
    expect(
      screen.getByText("Repetition: economy nullified"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/0s/)).toBeNull();
  });

  it("keeps its line height with nothing to show, so the clock does not jump on the first move", () => {
    const { container } = renderLine(null);
    const line = container.firstElementChild;
    expect(line).toHaveClass("min-h-5");
    expect(line).toBeEmptyDOMElement();
  });

  it("is hidden from assistive tech, which hears the move announcement instead", () => {
    const { container } = renderLine({ id: 1, items: [{ amount: 4 }] });
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("netDelta / deltaTintClass", () => {
  it("sums a side's events and tints by the sign of the net", () => {
    const delta: ClockDelta = {
      id: 1,
      items: [
        { amount: -2, type: "MovementToll" },
        { amount: 5, type: "CaptureGain" },
      ],
    };
    expect(netDelta(delta)).toBe(3);
    expect(deltaTintClass(delta)).toBe("clock-tint-gain");
    expect(deltaTintClass({ id: 2, items: [{ amount: -1 }] })).toBe(
      "clock-tint-loss",
    );
  });

  it("does not tint a clock the move left even", () => {
    expect(deltaTintClass(null)).toBe("");
    expect(deltaTintClass({ id: 1, items: [] })).toBe("");
    expect(
      deltaTintClass({ id: 1, items: [{ amount: 3 }, { amount: -3 }] }),
    ).toBe("");
  });
});

describe("Clock with a delta", () => {
  it("renders the delta inside the clock and tints the digits, without covering them", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <Clock
          side="White"
          seconds={65}
          active
          delta={{ id: 1, items: [{ amount: -2, type: "MovementToll" }] }}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("1:05").parentElement).toHaveClass(
      "clock-tint-loss",
    );
    const label = screen.getByText("Movement toll");
    // In normal flow under the digits, not an absolutely positioned overlay.
    expect(label.closest(".absolute")).toBeNull();
  });
});
