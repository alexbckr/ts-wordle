/**
 * Typescript Wordle
 * gh: https://github.com/alexbckr/ts-wordle
 *
 * HOW TO PLAY
 * 1. Fill in the array in CurrentGame with a list of strings (guesses)
 * 2. Hover ___DISPLAY___ to view game state
 *
 * Update TargetWord to play again
 */

type CurrentGame = GameLoop<
  [], // ← add your guesses here
  // e.g.
  // ['CLOWN', 'DOGGY']
  TargetWord
>;

/**
 * Hover to display the current game
 */
type ___DISPLAY___ = DisplayRows<PrettyGame>;

// Basic types
type Empty = 'Empty';
type Yellow = 'Yellow';
type Gray = 'Gray';
type Green = 'Green';
type Square = Empty | Yellow | Gray | Green;
type Row = [Square, Square, Square, Square, Square];
type Game = Row[];
type InitialGame = [];

// Game state types
type Guess<
  G extends Game,
  Prev extends Guess<any, any, any> | NullGuess,
  Word extends string | null
> = {
  __tag: 'guess';
  game: G;
  previous: Prev;
  word: Word;
};
type NullGuess = {
  __tag: 'null';
};
type Won<Prev extends Guess<any, any, any>> = {
  __tag: 'won';
  previous: Prev;
};
type Lost<Prev extends Guess<any, any, any>> = {
  __tag: 'lost';
  previous: Prev;
};
type Ongoing<Prev extends Guess<any, any, any>> = {
  __tag: 'ongoing';
  previous: Prev;
};

// Core marking logic
/**
 * Marks Green where guess and target letters match in the same position.
 */
type MarkGreen<G extends string[], T extends string[]> = G extends [
  infer GH,
  ...infer GT
]
  ? T extends [infer TH, ...infer TT]
    ? GH extends TH
      ? [Green, ...MarkGreen<Cast<GT, string[]>, Cast<TT, string[]>>]
      : [Empty, ...MarkGreen<Cast<GT, string[]>, Cast<TT, string[]>>]
    : []
  : [];

/**
 * Determines whether the current letter can be marked Yellow,
 * given how many times it appeared in the target, how many were
 * already marked Green, and how many have already been marked
 * Yellow.
 *
 * Prevents overmarking duplicate letters - e.g. guess with 3 E's
 * and target has 2 → only 2 total (green+yellow) marks allowed
 */
type CanMarkYellow<
  Letter extends string,
  Target extends string[],
  Guess extends string[],
  GreenMarks extends Square[],
  ProcessedMarks extends Square[],
  ProcessedGuess extends string[]
> = CountLetter<Target, Letter> extends infer TargetCount
  ? CountMarksByLetter<
      GreenMarks,
      Guess,
      Letter,
      Green
    > extends infer GreenCount
    ? CountMarksByLetter<
        ProcessedMarks,
        ProcessedGuess,
        Letter,
        Yellow
      > extends infer YellowCount
      ? TargetCount extends number
        ? GreenCount extends number
          ? YellowCount extends number
            ? Add<GreenCount, YellowCount> extends infer UsedCount
              ? UsedCount extends number
                ? TargetCount extends UsedCount
                  ? false
                  : true
                : never
              : never
            : never
          : never
        : never
      : never
    : never
  : never;

/*
 * Counts the number of types a letter has been marked with a given mark
 *
 * Used to track how many valid usages of a letter have already been consumed,
 * so we don’t mark too many yellows.
 *
 * e.g. CountMarksByLetter<[Green, Gray, Yellow], ['E','E','E'], 'E', Yellow> → 1
 */
type CountMarksByLetter<
  Marks extends Square[],
  Letters extends string[],
  TargetLetter extends string,
  MarkType extends Square,
  Count extends unknown[] = []
> = Marks extends [infer MHead, ...infer MTail]
  ? Letters extends [infer LHead, ...infer LTail]
    ? MHead extends MarkType
      ? LHead extends TargetLetter
        ? CountMarksByLetter<
            Cast<MTail, Square[]>,
            Cast<LTail, string[]>,
            TargetLetter,
            MarkType,
            [...Count, unknown]
          >
        : CountMarksByLetter<
            Cast<MTail, Square[]>,
            Cast<LTail, string[]>,
            TargetLetter,
            MarkType,
            Count
          >
      : CountMarksByLetter<
          Cast<MTail, Square[]>,
          Cast<LTail, string[]>,
          TargetLetter,
          MarkType,
          Count
        >
    : never
  : Count['length'];

/**
 * Marks yellow squares
 *
 * Skips letters already marked Green, and uses CanMarkYellow to
 * avoid duplicates
 *
 * Returns parallel Row of squares with Yellow and Gray, to be
 * merged with Greens for the final result
 */
type MarkYellow<
  G extends string[],
  T extends string[],
  GreenMarks extends Square[],
  ProcessedMarks extends Square[] = [],
  ProcessedGuess extends string[] = []
> = G extends [infer GH, ...infer GT]
  ? GH extends string
    ? GT extends string[]
      ? GreenMarks extends [infer GMH, ...infer GMT]
        ? GMH extends Green
          ? MarkYellow<
              GT,
              T,
              Cast<GMT, Square[]>,
              [...ProcessedMarks, Empty],
              [...ProcessedGuess, GH]
            >
          : GH extends T[number]
          ? CanMarkYellow<
              GH,
              T,
              G,
              GreenMarks,
              ProcessedMarks,
              ProcessedGuess
            > extends true
            ? MarkYellow<
                GT,
                T,
                Cast<GMT, Square[]>,
                [...ProcessedMarks, Yellow],
                [...ProcessedGuess, GH]
              >
            : MarkYellow<
                GT,
                T,
                Cast<GMT, Square[]>,
                [...ProcessedMarks, Empty],
                [...ProcessedGuess, GH]
              >
          : MarkYellow<
              GT,
              T,
              Cast<GMT, Square[]>,
              [...ProcessedMarks, Empty],
              [...ProcessedGuess, GH]
            >
        : never
      : never
    : never
  : ProcessedMarks;

/**
 * Merge marks with priority: Green > Yellow > Gray
 *
 * Assumes both arrays are aligned to the guess — e.g.
 * from MarkGreen and MarkYellow.
 */
type MergeMarks<G extends Square[], Y extends Square[]> = G extends [
  infer GH,
  ...infer GT
]
  ? GT extends Square[]
    ? Y extends [infer YH, ...infer YT]
      ? YT extends Square[]
        ? GH extends Green
          ? [Green, ...MergeMarks<GT, YT>]
          : YH extends Yellow
          ? [Yellow, ...MergeMarks<GT, YT>]
          : [Gray, ...MergeMarks<GT, YT>]
        : never
      : never
    : never
  : [];

// Core game logic
type IsAllGreen<T extends Row> = T[number] extends Green ? true : false;
type IsWinningGuess<T extends Row> = IsAllGreen<T>;
type AppendRow<G extends Game, R extends Row> = [...G, R];
type IsMaxGuessesReached<G extends Game> = G['length'] extends 6 ? true : false;

/**
 * Evaluates a guess against a target word
 * e.g. EvaluateGuess<'LEECH', 'LEVEL'> → [Green, Green, Yellow, Gray, Gray]
 *
 * Green is position-dependent, yellow is count-constrained
 * They are marked separately and then merged with precedence
 */
type EvaluateGuess<
  G extends string,
  T extends string
> = ToTuple<G> extends ValidGuess
  ? ToTuple<T> extends ValidGuess
    ? MergeMarks<
        MarkGreen<ToTuple<G>, ToTuple<T>>,
        MarkYellow<ToTuple<G>, ToTuple<T>, MarkGreen<ToTuple<G>, ToTuple<T>>>
      >
    : '__ERROR__: Invalid target word'
  : '__ERROR__: Invalid guess word';

/**
 * Core game reducer; processes a list of guesses and tracks game state
 */
type GameLoop<
  Guesses extends string[],
  Target extends string,
  State extends Guess<any, any, any> = Guess<InitialGame, NullGuess, null>
> = Guesses extends [infer Head, ...infer Tail]
  ? Head extends string
    ? Tail extends string[]
      ? EvaluateGuess<Head, Target> extends infer Evaluated
        ? Evaluated extends Row
          ? IsWinningGuess<Evaluated> extends true
            ? Won<Guess<AppendRow<State['game'], Evaluated>, State, Head>>
            : IsMaxGuessesReached<
                AppendRow<State['game'], Evaluated>
              > extends true
            ? Lost<Guess<AppendRow<State['game'], Evaluated>, State, Head>>
            : GameLoop<
                Tail,
                Target,
                Guess<AppendRow<State['game'], Evaluated>, State, Head>
              >
          : never
        : never
      : '__ERROR__: Invalid game (Tail is not a list of strings)'
    : '__ERROR__: Invalid guess (Head is not a string)'
  : Ongoing<State>;

// Utilities
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

/**
 * Type-level addition of two non-negative numbers
 * e.g. Add<2, 3> → 5
 */
type Add<
  A extends number,
  B extends number,
  CountA extends unknown[] = [],
  CountB extends unknown[] = []
> = CountA['length'] extends A
  ? CountB['length'] extends B
    ? [...CountA, ...CountB]['length']
    : Add<A, B, CountA, [...CountB, unknown]>
  : Add<A, B, [...CountA, unknown], CountB>;

/**
 * Cast type T to type U if T extends U, otherwise fallback to U.
 * Useful for enforcing or adjusting inferred types.
 */
type Cast<T, U> = T extends U ? T : U;

/**
 * A valid guess must be a tuple of exactly 5 string elements,
 * each representing a letter
 */
type ValidGuess = [string, string, string, string, string];

/**
 * Converts a 5-letter string literal type into a tuple of its characters.
 * e.g. ToTuple<'HELLO'> → ['H', 'E', 'L', 'L', 'O']
 */
type ToTuple<S extends string> =
  S extends `${infer A}${infer B}${infer C}${infer D}${infer E}`
    ? [A, B, C, D, E]
    : '__ERROR__: Invalid guess (must be 5 letters)';

/**
 * Returns the number of times a given letter appears in an array of strings.
 * e.g. CountLetter<['A', 'B', 'A', 'C'], 'A'> → 2
 */
type CountLetter<
  Arr extends string[],
  Letter extends string,
  Count extends unknown[] = []
> = Arr extends [infer Head, ...infer Tail]
  ? Head extends string
    ? Tail extends string[]
      ? Head extends Letter
        ? CountLetter<Tail, Letter, [...Count, unknown]>
        : CountLetter<Tail, Letter, Count>
      : never
    : never
  : Count['length'];

// Display (used to show annotations with emojis in your editor)
/** Converts a Square to its corresponding emoji symbol */
type SymbolOf<S extends Square> = S extends Green
  ? '🟩'
  : S extends Yellow
  ? '🟨'
  : S extends Gray
  ? '⬜'
  : S extends Empty
  ? '⬛'
  : never;

/** Converts a Row (array of Squares) into a Row of emoji strings */
type SymbolRow<R extends Row> = {
  [K in keyof R]: SymbolOf<R[K]>;
};

/**
 * Reconstructs the full history of the game, ordered from first to last.
 *
 * Returns an array of [Row, guess string] pairs, by walking the recursive
 * Guess chain from most recent to oldest.
 */
type GuessHistory<G, Acc extends [Row, string][] = []> = G extends Guess<
  infer Game,
  infer Prev,
  infer Word
>
  ? Word extends string
    ? Last<Game> extends Row
      ? Prev extends NullGuess
        ? [...Acc, [Last<Game>, Word]]
        : GuessHistory<Prev, [[Last<Game>, Word], ...Acc]>
      : Acc
    : GuessHistory<Prev, Acc>
  : G extends { previous: infer P }
  ? GuessHistory<P, Acc>
  : Acc;

/** Joins a tuple of strings into a single space-separated string */
type JoinRow<R extends string[], Acc extends string = ''> = R extends [
  infer Head,
  ...infer Tail
]
  ? Head extends string
    ? Tail extends string[]
      ? JoinRow<Tail, `${Acc}${Head} `>
      : never
    : never
  : TrimRight<Acc>;

/** Strips trailing space from a string */
type TrimRight<S extends string> = S extends `${infer R} ` ? TrimRight<R> : S;

/**
 * Combines a guess string and its corresponding Row of marks into a single line.
 * e.g. "GUESS 🟨⬜⬜⬜🟩"
 */
type DisplayLine<R extends Row, W extends string> = `${W} ${JoinRow<
  SymbolRow<R>
>}`;

/**
 * Recursively builds the final output lines for all guesses in the game.
 * Each line is [guess] [emoji row]
 */
type DisplayRows<
  Pairs extends [Row, string][],
  Acc extends string[] = []
> = Pairs extends [infer Head, ...infer Tail]
  ? Head extends [Row, string]
    ? Tail extends [Row, string][]
      ? DisplayRows<Tail, [...Acc, DisplayLine<Head[0], Head[1]>]>
      : [...Acc, DisplayLine<Head[0], Head[1]>]
    : Acc
  : Acc;

/** Adds a status prefix (e.g. "won", "lost") to the rendered game */
type DisplayWithStatus<Status extends string, Pairs extends [Row, string][]> = [
  Status,
  ...DisplayRows<Pairs>
];

/** Alias for rendering the current game history */
type PrettyGame = GuessHistory<CurrentGame>;

/**
 * Don't look at this or you'll ruin the surprise!
 */
type TargetWord = 'CATCH';
