import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { resetEmptyLobbyLeave } from "@/lib/emptyLobbyLeave";
import en from "../messages/en.json";
import { GameHubProvider } from "./GameHubProvider";
import { OpenSeekList, SEEK_PAGE_SIZE, SEEK_POLL_MS } from "./OpenSeekList";

const useAuth = vi.fn();
const push = vi.fn();
const pathname = vi.fn(() => "/");

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
  getOpenSeeks: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getOpenSeeks: api.getOpenSeeks,
  recordCounter: vi.fn(),
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

function renderList() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GameHubProvider>
        <OpenSeekList />
      </GameHubProvider>
    </NextIntlClientProvider>,
  );
}

describe("OpenSeekList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getOpenSeeks.mockResolvedValue([
      { pool: "bounty1", waitingSinceUtc: "2026-09-07T00:00:00Z" },
    ]);
    resetEmptyLobbyLeave();
  });

  afterEach(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
  });

  it("sends guests to login with next set to the current path", async () => {
    useAuth.mockReturnValue({ token: null, hydrated: true });
    renderList();
    const join = await screen.findByRole("button", { name: "Join" });
    fireEvent.click(join);
    expect(push).toHaveBeenCalledWith("/login?next=%2F");
    expect(hub.invoke).not.toHaveBeenCalled();
  });

  it("joins the named pool when signed in", async () => {
    useAuth.mockReturnValue({ token: "session", hydrated: true });
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "Join" }));
    await waitFor(() =>
      expect(hub.invoke).toHaveBeenCalledWith("JoinQueue", "bounty1"),
    );
  });

  it("shows five seeks at first and reveals the rest on Load more", async () => {
    useAuth.mockReturnValue({ token: "session", hydrated: true });
    const pools = [
      "bounty1",
      "burn1",
      "steal1",
      "steal2",
      "burn2",
      "steal3",
      "bounty1",
    ];
    api.getOpenSeeks.mockResolvedValue(
      pools.map((pool, i) => ({
        pool,
        waitingSinceUtc: `2026-09-07T00:0${i}:00Z`,
      })),
    );
    renderList();
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Join" })).toHaveLength(
        SEEK_PAGE_SIZE,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Load 2 more" }));
    expect(screen.getAllByRole("button", { name: "Join" })).toHaveLength(7);
    expect(screen.queryByRole("button", { name: /Load .* more/ })).toBeNull();
  });

  it("does not poll while the document is hidden (I-1-7)", async () => {
    expect(SEEK_POLL_MS).toBe(5_000);
    let hidden = true;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    useAuth.mockReturnValue({ token: "session", hydrated: true });
    renderList();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(api.getOpenSeeks).not.toHaveBeenCalled();
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(api.getOpenSeeks).toHaveBeenCalled());
  });
});
