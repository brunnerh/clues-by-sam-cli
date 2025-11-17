# Clues by Sam CLI Instructions

This document provides instructions on how to play the game "Clues by Sam" using
the command-line interface.

When instructed to play the game, do not ask for input and only use logic to
progress the game on your own. All required information to deduce the next step
is already available in the game. Do not guess.

Do not read any files, only use `clues-by-sam-cli`.

Start with `clues-by-sam-cli start`.

## Commands

- `clues-by-sam-cli start` to start the game server and get the initial game
  board state.
- `clues-by-sam-cli board` to get a current view of the game board at any point.
- `clues-by-sam-cli (innocent|criminal) <coordinate>` to mark a suspect in the
  game as either innocent or criminal.\
  If the move was correct, an additional clue may be returned.\
  If there is not enough logical evidence to make that determination, this will
  be reported as a mistake.\
  Do **not** use the `-b` flag to minimize the output.

## Rules

Your goal is to figure out who is criminal and who is innocent.

Based on what you know, mark a suspect as innocent or criminal. If correct, they
might reveal a new clue.

You cannot guess! Just like in real life, you can't convict someone based on a
50/50 hunch. There is always a logical next choice, even when you think there
isn't!

### Game Board

- The game board is a grid with 5 rows (1-5) and 4 columns (A-D).
- Each suspect has...
  - A coordinate, such as A1, B3, etc.
  - A name
  - A profession
  - A status: innocent, criminal, or unknown

### Clarifying details

Everyone is either a criminal or innocent.

Professions don't make some innocent or criminal, unless a hint suggest so. A
police is as criminal as an accountant until proven otherwise.

Everyone speaks the truth, even the criminals.

**Neighbors** always include diagonal neighbors. One person can have up to 8
neighbors.

**In between** (or sometimes just **between**) means the persons between the
two, not including the two.

**Connected** means a chain of orthogonal adjacency. For example "all criminals
in row 1 are connected" means there are no innocents between any two criminals
in that row.

**Rows** go sideways and are numbered 1,2,3,4,5. **Columns** go up and down and
lettered A,B,C,D.

**To the left/right** always means somewhere in the same row. **Above/below**
always means somewhere in the same column.

**Directly to the left/right/above/below** always means the neighbor to the
left/right/above/below.

**All** always means there's at least one. It doesn't necessarily mean there's
more than one.

**Any** doesn't tell anything about the number of criminals/innocents. "Any
criminal on row 2 is..." means "If there are any criminals on row 2, they would
be ..."

**One of the innocents/criminals / one of several / one of multiple** always
means there's at least two innocents/criminals. This is slightly conflicting
with "All innocents/criminals..." and I'm open for suggestions how to improve
the phrasing here!

**Common neighbors** means those who are neighbors of both persons. It does not
include the persons themselves.

**Share** means "have in common". For example, "Share an odd number of innocent
neighbors" means "have an odd number of common innocent neighbors".

**In total** always means the sum of all in the group(s). Two criminal cops and
cooks in total means there might be 1 cop and 1 cook, or 0 cops and 2 cooks, or
2 cops and 0 cooks.

**Corner** means the four corners.

**Edge** means the 14 persons "surrounding" the board, including corners.

... **the most** always means uniquely the most. If John has the most criminal
neighbors, no one can have as many criminal neighbors as John.

An even number means numbers divisible by two: 0, 2, 4, 6... and an odd number
means everything else: 1, 3, 5, 7...

**More** doesn't mean there needs to be any in the lesser group. For example
"There are more innocents in row A than row B" doesn't require there to be any
innocents in row B.

Numbers are exact unless stated otherwise. "There are 2 criminal coders" means
there's exactly 2 criminal coders.

"If A then B" does NOT mean the same as "If and only if A then B". Therefore it
does NOT mean "If not A then not B". But please note that, due to how logic
works, it DOES mean "If not B then not A". (It's called the contraposition.)

**You never need to guess**. In fact, the game only allows you to make logical
choices.
