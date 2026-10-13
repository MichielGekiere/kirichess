# Soft launch post (r/chessvariants)

**Title:** KiriChess: a chess variant where captures, moves and checks all move time on the clocks

---

Hi, I am a student and I built a chess variant as a hobby. It is finally playable online, free, no
ads: **https://kirichess.com/?src=reddit**. I care more about feedback on the rules than about the
website, so this post is mostly how it works.

**The idea in one line:** normal chess still applies, but the clock is a resource that moves between
the players, not only a timer that goes down.

There are four rules, always in the same order.

**1. Captures move time.** When you take a piece, you get (or remove) time based on how strong it
is: pawn 5 seconds, knight or bishop 10, rook 15, queen 25. What happens with that time depends on
the pool:

- **Steal** - you gain it, the opponent loses it. Only winning material changes the gap.
- **Bounty** - you gain it, nobody loses. Captures add time to the game.
- **Burn** - the opponent loses it, you gain nothing. Even equal trades take time from both clocks.

**2. Every move costs time from your own clock**, based on the piece you moved. Pawn 1 second,
knight or bishop 2, rook 3, queen 4. The king is also 1, so moving the king in the endgame is not
too expensive. Castling is a flat 3 (not 4).

**3. Giving check moves 2 seconds from the checked player to the checker.** You still pay the move
cost from rule 2. A queen check basically pays for itself (the gap does not change). A pawn check
is good for you (+3 seconds on the gap). Cheaper checking pieces are better for the attack.

**4. If the same position already happened, there are no time effects.** No capture time, no move
cost, no check time. I added this because without it, perpetual check can just farm the opponent's
clock down to zero without improving the position. Once a position has been seen, it stays "off"
for the rest of the game. You cannot avoid this by switching between two patterns.

**Why I wanted to build this:** mate needs moves, and moves cost time, so a winning position has a
price. King and rook against a lone king is about 70 seconds of move costs. Bishop and knight is
about 88. In a 1+0 pool you can be totally winning on the board and still not have enough time to
finish. So you have to plan the endgame *before* you trade into it. Trading down when you are ahead
is not always correct anymore, and that changes middlegame decisions more than I expected.

There are six rated pools with the three economies above, different time controls, and different
capture multipliers, from 1+0 Bounty (Winder) up to 15+0 Steal (Eclipse). Full rules are on the
site under Rules. The numbers there come from the same config the server uses.

**What is there:** rated play (Glicko-2), a tutorial, replays with clock analysis after the game,
spectating, and bots to practice against. It works on a phone. Rules text is CC BY 4.0. Platform
source is Apache-2.0 at https://github.com/MichielGekiere/kirichess.

**What is not there yet:** no tournaments, no puzzles, the UI is okay but not beautiful, and right
now the player base is mostly me. If you queue and nobody is there, that is not a bug — it is the
usual problem for a new variant. There is one standing hour on purpose: **Fridays 20:00 UTC**
(evening in western Europe, afternoon in the Americas). Outside that, play a bot or bring a friend.

I am one person, not a company. It is free because I want players more than money. There is a donate
page, but nobody has to use it.

**Things I would really like to know:**

1. Does the capture economy break at a high level in a way I cannot see? I think Steal is the most
   solid and Burn is the most unstable, but strong players have not really tested it yet.
2. Are the endgame costs about right, or should mating be cheaper?
3. Is the repetition rule a good fix for perpetual check, or does it create a worse problem
   somewhere else?
4. Does the tutorial actually teach the clock ideas, or only the rules text?

Happy to answer questions, and also happy if you tell me the whole idea is bad. If you want to talk
more after the thread: https://discord.gg/GRusewDw4
