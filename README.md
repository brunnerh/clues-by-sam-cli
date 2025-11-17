# Clues by Sam CLI

A command-line interface (CLI) for playing the logic deduction game
[_Clues by Sam_](https://cluesbysam.com/).\
The primary purpose of this CLI is to facilitate automated gameplay by AI agents
to test their logical reasoning capabilities.

## Requirements

- As of 2025-11-17, Deno v2.5.0 or v2.5.1 due to a later regression in the
  sockets implementation
  ([#30960](https://github.com/denoland/deno/issues/30960)).
- Installation of a browser binary for Puppeteer:
  - For headless mode (the default) run `deno task install-headless`
  - For non-headless mode run `deno task install` and add the `--no-headless`
    flag when running the application.

## Building and Running

```shell
deno task build
```

This will compile a standalone executable and output it to the `dist/`
directory. The executable should be available in the PATH to use the automatic
server start function.

Running the executable without arguments will show instructions on how to use
it.

```shell
clues-by-sam-cli
```

## Agent Instructions

The file
[.github/instructions/clues-by-sam.instructions.md](.github/instructions/clues-by-sam.instructions.md)
contains detailed instructions for AI agents on how to play the game using this
CLI.
