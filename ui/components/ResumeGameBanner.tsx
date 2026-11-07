"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/Card";
import { useAuth } from "@/components/AuthProvider";
import { getCurrentGame } from "@/lib/api";
import { recallBotGame, returnToGameHref } from "@/lib/returnToGame";

/**
 * A player who closed the tab or navigated away mid-game lands back on the lobby with no way to
 * find the board again, short of trying to start a second game and being refused. This asks the
 * server (GET /api/games/playing) whether the signed-in player is still seated and, if so, offers
 * the way back. Gated on `hydrated && token` like SanctionBanner, so a signed-out visitor never
 * sends a request that can only 401. A failed lookup renders nothing.
 */
export function ResumeGameBanner() {
  const t = useTranslations("play");
  const { token, hydrated } = useAuth();
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    getCurrentGame()
      .then((game) => {
        if (cancelled) return;
        setHref(game ? returnToGameHref(game, recallBotGame()) : null);
      })
      .catch(() => {
        // Silent: the lobby must not break because this lookup failed.
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, token]);

  if (!href) return null;

  return (
    <Card
      accentColorVar="--bounty"
      className="mb-8 flex items-center justify-between gap-4 flex-wrap"
    >
      <p className="text-sm text-[var(--foreground)] leading-relaxed m-0">
        {t("alreadyInGamePlain")}
      </p>
      <Link href={href} className="btn-primary px-5 py-2 text-sm">
        {t("resumeGameCta")}
      </Link>
    </Card>
  );
}
