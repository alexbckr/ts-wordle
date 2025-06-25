# Wordle in TypeScript's Type System

A fully type-level implementation of Wordle written entirely in TypeScript types. [Open in GitHub](https://github.com/alexbckr/ts-wordle)

## Why is this cool?

This is a full Wordle engine written entirely in TypeScript types — no runtime code, just the type system doing all the work. The TypeScript compiler is the game engine and your IDE is the UI. You play by editing code and checking annotations.

It handles everything — recursive types, template literal logic, type-level math, even tricky Wordle edge cases. All statically.

Modern TypeScript is just a weird little functional language hiding in plain sight.

## How to Play

1. Open the code in an IDE with good TypeScript support (e.g. VSCode). You can alternatively hit `.` while on this repo's GitHub page, which will open `github.dev` in your browser.
2. Locate the `CurrentGame` type and add your guesses:

```ts
type CurrentGame = GameLoop<
  ['PLATE', 'CLOVE', 'ELECT'], // ← Your guesses here
  TargetWord
>;
```

3. Hover over the `___DISPLAY___` type to see your game history rendered as emoji:

```ts
type ___DISPLAY___ = DisplayRows<PrettyGame>;
```

The annotation will look like the following, assuming a `TargetWord` of `ELECT`:

```ts
PLATE 🟨⬜⬜⬜🟩 CLOVE ⬜🟩⬜⬜⬜ ELECT 🟩🟩🟩🟩🟩
```

You can change the `TargetWord` to a new 5-letter word to play again.

## How does it work?

1. Mark correct letters in the correct place as 🟩 (Green).
2. Mark correct letters in the wrong place as 🟨 (Yellow). This one is tricky. First off, you have to make sure you're not re-marking letters that are in the correct place. Consider the target `REACT` and the guess `EERIE`. The result we'd want is `EERIE ⬜🟩⬜⬜⬜`; since the `E` is already accounted for as 🟩, the other `E`s are not 🟨 but ⬜.

   We also have to make sure we're capping 🟩 and 🟨 to the number in the target. Consider a target `GUESS` and a guess `LEVEL`. The expectation here is `LEVEL ⬜🟨⬜⬜⬜`; the second letter `E` is marked 🟨. The fourth `E` is marked ⬜ since only one `E` exists in the target and it's already used.

   **How the code handles this:** The implementation uses a two-pass approach. First, `MarkGreen` identifies all exact position matches. Then `MarkYellow` processes each remaining letter, using `CanMarkYellow` to check if marking it yellow would exceed the total count of that letter in the target word. This prevents over-marking duplicates while respecting letters already marked green.

   One alternative here would be to treat the target like a bucket of letters and cross them off as they're used — conceptually simpler, but the counting strategy felt more natural to implement in TypeScript’s type system (stateless, recursive, no mutation).

3. Mark incorrect letters as ⬜ (Gray).
4. Track win/loss state based on guess count and correctness.

h/t to [Nate](https://github.com/nathanhleung)
