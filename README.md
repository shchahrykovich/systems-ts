# Systems (TypeScript)

[![npm version](https://img.shields.io/npm/v/systems-ts.svg)](https://www.npmjs.com/package/systems-ts)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

`systems-ts` is a TypeScript port of the [systems](https://github.com/lethain/systems) library for describing, running, and visualizing [systems diagrams](https://lethain.com/systems-thinking/).

This is a complete rewrite of the original Python library in TypeScript, maintaining API compatibility while adding strong typing and modern JavaScript/TypeScript features.

## Features

- **Stock and Flow Modeling**: Define stocks (containers of values) and flows (transitions between stocks)
- **Multiple Flow Types**:
  - **Rate**: Fixed transfer per round
  - **Conversion**: Multiplies source by a conversion rate
  - **Leak**: Removes a percentage from source
- **Formula Support**: Use mathematical formulas with references to other stocks
- **Validation**: Automatic cycle detection and reference validation
- **TypeScript**: Full type safety and IntelliSense support
- **Zero Dependencies**: Pure TypeScript with no runtime dependencies

## Installation

```bash
npm install systems-ts
```

```bash
yarn add systems-ts
```

```bash
pnpm add systems-ts
```

## Quick Start

### Using the Parser API

```typescript
import { parse } from 'systems-ts';

const spec = `
[Candidates] > PhoneScreens @ 25
PhoneScreens > Onsites @ 0.5
Onsites > Offers @ 0.5
Offers > Hires @ 0.5
`;

const model = parse(spec);
const results = model.run(10);
console.log(model.render(results));
```

### Using the Programmatic API

```typescript
import { Model, Rate, Conversion } from 'systems-ts';

const m = new Model('Hiring Funnel');

const candidates = m.infiniteStock('Candidates');
const phoneScreens = m.stock('PhoneScreens');
const onsites = m.stock('Onsites');

m.flow(candidates, phoneScreens, new Rate(25));
m.flow(phoneScreens, onsites, new Conversion(0.5));

const results = m.run(10);
console.log(m.render(results));
```

## Syntax Specification

### Stocks

Stocks hold values and can be specified with initial and maximum values:

```
MyStock              # Initial: 0, Maximum: infinity
MyStock(10)          # Initial: 10, Maximum: infinity
MyStock(5, 20)       # Initial: 5, Maximum: 20
[InfiniteStock]      # Infinite stock (not shown in output)
```

### Flows

Flows transfer values between stocks:

```
a > b @ 5              # Rate: transfer 5 units per round
a > b @ 0.5            # Conversion: multiply a by 0.5, consume source
a > b @ Rate(5)        # Explicit rate
a > b @ Conversion(0.5) # Explicit conversion
a > b @ Leak(0.1)      # Leak: remove 10% per round
```

### Formulas

Formulas can reference other stocks and use basic arithmetic:

```
Recruiters(3)
Engineers(Managers * 4, Managers * 8)
[Candidates] > Engineers @ Recruiters * 6
```

## Development

### Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Generate coverage report
```

### Building

```bash
npm run build
```

### Examples

Check the `examples/` directory in the repository for sample system specifications.

## API Reference

### Core Classes

- **Model**: Container for stocks and flows
- **Stock**: Holds values with initial and maximum constraints
- **Flow**: Connects two stocks with a rate
- **Rate**: Fixed transfer per round
- **Conversion**: Multiplies source by conversion rate
- **Leak**: Removes percentage from source
- **Formula**: Evaluates mathematical expressions

### Parser Functions

- **parse(spec: string)**: Parse a system specification into a Model
- **lex(text: string)**: Tokenize input text
- **lexFormula(text: string)**: Parse a formula expression

## Differences from Python Version

This TypeScript implementation maintains API compatibility with the Python version while adding:

- Full TypeScript type definitions
- Modern ES6+ module system
- Improved error messages with stack traces
- More explicit type checking

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC License - see the [LICENSE](LICENSE) file for details.

## Credits

- Original Python library by [Will Larson](https://lethain.com/)
- TypeScript port by Sergey Shchegrikovich

## Links

- [npm Package](https://www.npmjs.com/package/systems-ts)
- [GitHub Repository](https://github.com/shchahrykovich/systems-ts)
- [Issue Tracker](https://github.com/shchahrykovich/systems-ts/issues)
- [Original Python Library](https://github.com/lethain/systems)
