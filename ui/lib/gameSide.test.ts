import { describe, expect, it } from "vitest";
import { isHotseatGame, localPlayerSide } from "./gameSide";

const USER = "user-1";
const OPPONENT = "user-2";

describe("localPlayerSide", () => {
  it("returns the bot-mode colour even when the same account sits both seats", () => {
    expect(localPlayerSide(USER, USER, true, "Black")).toBe("Black");
  });

  it("returns White when the signed-in user sits White", () => {
    expect(localPlayerSide(USER, USER, false, "White")).toBe("White");
  });

  it("returns Black when the signed-in user sits Black", () => {
    expect(localPlayerSide(OPPONENT, USER, false, "White")).toBe("Black");
  });
});

describe("isHotseatGame", () => {
  it("is true when one account sits both seats and it is not a bot game", () => {
    expect(isHotseatGame(false, USER, USER)).toBe(true);
  });

  it("is false for a bot game, even though the server also sits the same id both sides", () => {
    expect(isHotseatGame(true, USER, USER)).toBe(false);
  });

  it("is false for two distinct players", () => {
    expect(isHotseatGame(false, USER, OPPONENT)).toBe(false);
  });
});
