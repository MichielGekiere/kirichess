import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeGameBanner } from "./ResumeGameBanner";
import { getCurrentGame } from "@/lib/api";

const auth = { token: "t" as string | null, hydrated: true };

vi.mock("@/lib/api", () => ({
  getCurrentGame: vi.fn(),
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => auth,
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
}));

const messages = {
  play: {
    alreadyInGamePlain: "You're already in a game.",
    resumeGameCta: "Return to game",
  },
};

function renderBanner() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ResumeGameBanner />
    </NextIntlClientProvider>,
  );
}

describe("ResumeGameBanner", () => {
  beforeEach(() => {
    vi.mocked(getCurrentGame).mockReset();
    localStorage.clear();
    auth.token = "t";
    auth.hydrated = true;
  });

  it("offers the way back to a game the player is still seated in", async () => {
    vi.mocked(getCurrentGame).mockResolvedValue({
      gameId: "11111111-1111-4111-8111-111111111111",
      pool: "steal1",
      solo: false,
    });
    renderBanner();
    const link = await screen.findByRole("link", { name: "Return to game" });
    expect(link).toHaveAttribute(
      "href",
      "/game/11111111-1111-4111-8111-111111111111?preset=steal1",
    );
  });

  it("renders nothing when the player is not in a game", async () => {
    vi.mocked(getCurrentGame).mockResolvedValue(null);
    const { container } = renderBanner();
    await waitFor(() => expect(getCurrentGame).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("does not ask the server for a signed-out visitor", () => {
    auth.token = null;
    const { container } = renderBanner();
    expect(getCurrentGame).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
