# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`systems-ts` is a TypeScript port of the [systems](https://github.com/lethain/systems) library for describing, running, and visualizing systems diagrams. It implements a domain-specific language (DSL) for modeling stock and flow systems - useful for understanding organizational processes like hiring funnels, resource allocation, and capacity planning.

## Core Architecture

### Module Structure

The codebase is organized into 6 main modules:

1. **lexer.ts** - Tokenizes the systems DSL into structured tokens
2. **parse.ts** - Builds Model objects from lexed tokens
3. **models.ts** - Core simulation engine containing Stock, Flow, Formula, Rate types, and the Model runner
4. **algos.ts** - Graph algorithms (primarily cycle detection for validating formula references)
5. **errors.ts** - Custom error hierarchy for parse and validation errors
6. **index.ts** - Public API exports

### Key Concepts

**Stocks** - Containers that hold numeric values. Can be regular (with initial/max values) or infinite (shown with `[brackets]` syntax).

**Flows** - Transitions between stocks with three rate types:
- `Rate`: Fixed transfer per round (e.g., 5 units)
- `Conversion`: Multiplies source by a rate, consumes source entirely
- `Leak`: Removes percentage from source, leaves remainder

**Formulas** - Mathematical expressions that can reference other stocks. Used for initial values, maximums, and flow rates. Validated for circular dependencies.

**Model** - Container that holds stocks/flows and runs simulations by advancing state over rounds.

### Execution Flow

1. User provides spec string (e.g., `"[Candidates] > PhoneScreens @ 25"`)
2. `lex()` tokenizes the spec into structured tokens
3. `parse()` builds a Model by creating Stock and Flow objects
4. Model validates:
   - All stock references exist
   - No circular dependencies in formula references (using `findCycles()`)
   - Legal source stocks for Conversion/Leak (cannot be infinite)
5. `model.run(rounds)` simulates by advancing state and returns snapshots

### State Management

The `State` class manages stock values during simulation. It:
- Initializes stocks in dependency order (computed by `findCycles()` to respect formula references)
- Advances by processing flows in reverse order (to handle dependent flows correctly)
- Uses deferred updates to avoid race conditions

## Development Commands

### Build
```bash
npm run build
```
Compiles TypeScript to `dist/` directory with declarations and source maps.

### Testing
```bash
npm test                # Run all tests with Vitest
npm run test:watch      # Watch mode for development
npm run test:coverage   # Generate coverage report
```

Test files are in `tests/` directory. Vitest is configured with global test APIs.

To run a single test file:
```bash
npx vitest tests/models.test.ts
```

To run a specific test case:
```bash
npx vitest -t "should respect stock maximum values"
```

### Type Checking
```bash
npx tsc --noEmit
```
TypeScript is configured with strict mode enabled.

## Important Implementation Details

### Formula Validation and Execution Order

Formulas can reference other stocks, creating dependencies. The `findCycles()` algorithm in `algos.ts` performs topological sorting to:
1. Detect circular references (throws `CircularReferences` error if found)
2. Compute `initialPath` - the order stocks must be initialized to satisfy dependencies

This ensures formulas like `Engineers(Managers * 4)` work correctly by initializing `Managers` before `Engineers`.

### Flow Processing Order

Flows are processed in **reverse order** during `State.advance()`. Changes to destination stocks are deferred to avoid mid-round race conditions. This ensures consistent behavior when multiple flows target the same stock.

### Auto-detection of Flow Types

The parser auto-detects flow types when not explicitly specified:
- Decimal values (e.g., `@ 0.5`) → `Conversion`
- Whole numbers (e.g., `@ 5`) → `Rate`
- Explicit types: `@ Rate(5)`, `@ Conversion(0.5)`, `@ Leak(0.1)`

### Stock Reuse Rules

Stocks can be declared multiple times, but:
- ✅ Can add initial/max values to previously undefined stocks
- ❌ Cannot conflict with existing initial/max values (throws `ConflictingValues`)

Example:
```
a > b @ 5      # b defaults to initial=0
b(10) > c @ 3  # OK: sets b's initial to 10
```

## Testing Strategy

Current test coverage includes:
- **lexer.test.ts**: Token parsing for all syntax elements
- **parse.test.ts**: DSL parsing, stock reuse, formula references
- **models.test.ts**: Stock maximums/minimums, flow types, formula computation

When adding features:
1. Add lexer tests if introducing new syntax
2. Add parse tests if changing how specs are interpreted
3. Add model tests for simulation behavior
4. Test error cases (invalid syntax, circular refs, conflicting values)

## Common Patterns

### Adding a New Flow Type

1. Create class extending `RateBase` in `models.ts`
2. Implement `calculate(state, src, dest, capacity)` method
3. Override `validateSource()` if source stock has constraints
4. Add lexer support in `lexer.ts` (if new syntax needed)
5. Update `buildFlow()` in `parse.ts` to recognize the type
6. Add tests for the new flow type

### Debugging Parse Errors

Parse errors include line numbers and context. Set `tracebacks: true` in `parse()` to log errors to console before throwing. The error hierarchy uses `DeferLineInfo` to attach line context to errors thrown deep in the stack.
