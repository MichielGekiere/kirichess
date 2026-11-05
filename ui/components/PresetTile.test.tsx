import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import en from "../messages/en.json";
import { PRESETS } from "../lib/presets";
import { PresetTile } from "./PresetTile";

/** Read rather than typed: config/kirichess.rules.json owns the name and PoolLabelDriftTests fails
 *  the build on a hardcoded one. This is the pool `renderTile` mounts. */
const POOL = PRESETS.bounty1.label;

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("PresetTile", () => {
  it("shows only the searching state while queued, with no bot offer", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PresetTile
          presetKey="bounty1"
          rating={1500}
          searching
          onToggle={() => undefined}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Searching…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bot/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: `Searching ${POOL}… (cancel)` }),
    ).toBeInTheDocument();
  });
});
