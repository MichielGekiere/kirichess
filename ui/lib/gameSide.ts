import type { Side } from "@/lib/types";

/**
 * Which colour the local player is on, for a live game (never a spectator: watch/replay/learn
 * never call this). In bot mode the human's colour is fixed by the mode's `playerSide`; in a PvP
 * game it's whichever side's player id matches the signed-in user.
 *
 * Pulled out of six near-identical ternaries in `game/[id]/page.tsx` (audit C-2-11) so the move
 * announcer, the game-ended announcer, the clock-urgency effect and the render body all agree by
 * construction instead of by five hand-kept copies - one of which had drifted (see C-2-11's
 * `actualPlayerSide`, which omitted the bot-mode branch).
 *
 * Pass-and-play (Custom → Local) is still a solo game on the server (one account on both seats).
 * This helper still returns White there, because clocks and the result overlay need a bottom
 * colour. Do not pass that value to `<Board mySide>`: {@link isHotseatGame} is the gate that
 * leaves both colours movable.
 */
export function localPlayerSide(
  whitePlayerId: string,
  userId: string | null | undefined,
  isBotMode: boolean,
  playerSide: Side,
): Side {
  if (isBotMode) return playerSide;
  return whitePlayerId === userId ? "White" : "Black";
}

/**
 * Custom "Local" / pass-and-play: one signed-in account sits both seats, and Stockfish is not
 * moving the other colour. Bot games also share an id on both seats, so `isBotMode` must be
 * excluded or the human would be allowed to drag the engine's pieces.
 */
export function isHotseatGame(
  isBotMode: boolean,
  whitePlayerId: string,
  blackPlayerId: string,
): boolean {
  return !isBotMode && whitePlayerId === blackPlayerId;
}
