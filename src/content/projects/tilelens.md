---
title: TileLens
description: Reads a tile-game board off the screen and previews the best word plays, locally, in milliseconds.
techStack: [Python, OpenCV, NumPy, PySide6, PyObjC, DAWG, pytest]
githubUrl: https://github.com/JMBugarin/tilelens
category: Computer vision and search
stat: 2.2 ms median search
order: 2
problem: Finding the best play in a tile game means searching every legal placement of a rack against a 200,000-word list, which is easy for a computer and hopeless to do by eye in a 60-second turn. The hard part is the input. Tools that need the board typed in by hand are too slow, and a tool that reads pixels will sometimes misread a tile and quietly suggest a play that doesn't exist.
solution: TileLens watches the screen, finds and reads the board, and waits until a position agrees across three frames before it trusts it. Tiles it can't read are flagged instead of guessed, and a directed word graph (DAWG) searches the rest in a separate process. The top plays show up as ghost tiles over the live game. Frames stay in memory, with no network requests at run time.
next:
  - "Look past this turn: rack-leave evaluation and opponent modeling, since it only maximizes the current turn's score today."
  - "Let it learn the game's real dictionary, so rejected words get blocked and missing valid words get allowed."
  - "Add more games through the profile format, instead of one game's colors and layout."
  - "Support Windows and Linux capture. It runs on macOS and Apple silicon only."
  - "Test on more machines, Discord's own fullscreen, and blank tiles, none of which were seen in live testing."
results:
  - "2.2 ms median search on mid-game 13x13 boards with a 204k-word list. That measures search only, not the whole screen-to-overlay loop."
  - "99.9 to 100% of squares read on synthetic boards across five themes, with zero silent errors."
  - "14 of 14 letters and values read on real Discord rack captures, uncalibrated (two racks)."
  - "On a real Discord board as read from the screen, with two blanks in the rack, branch-and-bound pruning cut a search from 642 ms to 187 ms with identical results."
  - "541 tests pass in macOS CI and 504 on Ubuntu. The fast search is checked against a brute-force solver on every run, and against a frozen copy of the old search in 59 equivalence tests."
struggles:
  - issue: "It read things that weren't on the board. The chat sidebar, the letterbox bars and video tiles around Discord's activity share colors with the board, so stray squares were read as tiles and one bad read could ruin a search."
    fix: "I switched to color detection of the board itself. A square only counts if it matches an empty square's own color closely, since the background is almost the same. The board is the dense stretch of such squares, and a side only ends where the line beyond it is plain background. Anything outside that stretch, and outside the game's canvas, is never read."
  - issue: "The board kept growing. Letter League adds columns and rows as words near an edge (a 27x19 board became 30x19), so a fixed layout cut the board short."
    fix: "The profile can repeat its pattern into extra room around the board, and TileLens re-measures the board's edges on the squares themselves every 0.7 s without searching for the board again. A panel covering the top rows leaves that side open instead of cutting the board short."
  - issue: "The spinning star on the start square blocked every suggestion at the start of a round, because it was read as an unreadable tile."
    fix: "A star on a square that still has its own color now counts as an empty square, and as a sign that no word has been played yet."
  - issue: "Scores came out wrong. Played tiles show the value they scored with premiums applied, and the game counts that number again when the tile is reused."
    fix: "TileLens reads a value per tile and falls back to the letter's own value when it can't. It matched the game's score on a real game (90 after three turns, and 11 for a play the plain values scored 8)."
  - issue: "Searches on real boards were slow. On the grown Discord board with two blanks in the rack, one search took about 640 ms, the slowest step in the live loop."
    fix: "I added branch and bound: for each row the search precomputes an overestimate of what the rest of a word could still score and skips branches that can't reach the current top three, plus a capped cache of cross-check letter sets. That board now takes 187 ms. A frozen copy of the old search and the brute-force solver pin the exact placements, scores and tie order."
media:
  - kind: video
    group: demo
    src: media/tilelens/tilelens-discord-live.mp4
    poster: media/tilelens/discord-live-02-1600.webp
    alt: Recording of TileLens drawing suggested plays over a live Letter League game in Discord
    caption: A live Letter League game in Discord, recorded on November 11, 2026. About 50 seconds, real time. Player card blurred.
    width: 1920
    height: 1080
  - kind: video
    group: demo
    src: media/tilelens/tilelens-demo.mp4
    poster: media/tilelens/demo-01-1600.webp
    alt: Recording of TileLens in demo mode playing its built-in synthetic game
    caption: Demo mode, playing the built-in synthetic game. It needs no permissions and no real game. 58 seconds.
    width: 1920
    height: 1080
  - kind: image
    group: interface
    src: media/tilelens/discord-live-01-1600.webp
    alt: TileLens drawing a suggested play as ghost tiles over a Letter League board, with its panel listing the top three plays.
    caption: Ghost tiles for the top suggestion, and the panel with the three best plays and their scores.
    width: 1600
    height: 1012
  - kind: image
    group: interface
    src: media/tilelens/discord-live-04-1600.webp
    alt: TileLens panel in its aligning state with placeholder rows while it finds the board.
    caption: Aligning. Nothing is suggested until the board has been found and read.
    width: 1600
    height: 1012
  - kind: image
    group: interface
    src: media/tilelens/discord-live-03-1600.webp
    alt: TileLens in its frosted-glass panel suggesting MAVIN as ghost tiles below the AEROBIA word on the board.
    caption: A second suggestion, drawn as ghost tiles, with the glass panel listing the next best plays.
    width: 1600
    height: 1012
---
## Decisions

- **Correctness before coverage.** Unclear tiles are flagged and search works around them. A valid play can be missed until the doubt is resolved.
- **Never show stale results.** Any movement clears the preview right away, so a suggestion can't drift off its board.
- **One turn, done well.** Interrupted searches are labeled "best found so far".
- **Local only.** The overlay is excluded from its own captures.

## Limits

- macOS on Apple silicon only, tested live on one machine.
- A side project for practice and learning. It is not meant for ranked play and is not affiliated with any game.
