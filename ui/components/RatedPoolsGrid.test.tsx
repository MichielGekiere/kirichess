import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetEmptyLobbyLeave } from "@/lib/emptyLobbyLeave";
import en from "../messages/en.json";
import { PRESETS } from "../lib/presets";
import { GameHubProvider } from "./GameHubProvider";
import { RatedPoolsGrid } from "./RatedPoolsGrid";

const useAuth = vi.fn();
const push = vi.fn();
const pathname = vi.fn(() => "/");

/** Read rather than typed: config/kirichess.rules.json owns the name and PoolLabelDriftTests fails
 *  the build on a hardcoded one. `bounty1` is the pool the assertions below queue into. */
const POOL = PRESETS.bounty1.label;

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => useAuth(),
}));

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
  usePathname: () => pathname(),
  useRouter: () => ({ push }),
}));

const api = vi.hoisted(() => ({
  getMyRatings: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/api", () => ({
  getMyRatings: api.getMyRatings,
}));

const hub = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  on: vi.fn(),
  onreconnected: vi.fn(),
  state: "Connected",
}));

vi.mock("@/lib/realtime", () => ({
  createGameConnection: () => hub,
  stopWhenSettled: vi.fn(),
}));

function renderGrid() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GameHubProvider>
        <RatedPoolsGrid />
      </GameHubProvider>
    </NextIntlClientProvider>,
  );
}

describe("RatedPoolsGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hub.invoke.mockResolvedValue(undefined);
    hub.start.mockResolvedValue(undefined);
    api.getMyRatings.mockResolvedValue([]);
    resetEmptyLobbyLeave();
  });

  it("sends guests to login with next set to the current path", () => {
    useAuth.mockReturnValue({ token: null, hydrated: true });
    renderGrid();
    fireEvent.click(screen.getByRole("button", { name: `Queue ${POOL}` }));
    expect(push).toHaveBeenCalledWith("/login?next=%2F");
    expect(hub.invoke).not.toHaveBeenCalled();
  });
});
