/**
 * systems.models implements the core modeling functionality.
 */

import { IllegalSourceStock, InvalidFormula, CircularReferences } from './errors';
import * as lexer from './lexer';
import { FormulaToken, TOKEN_DECIMAL, TOKEN_FORMULA, TOKEN_INFINITY, TOKEN_OP, TOKEN_REFERENCE, TOKEN_WHOLE } from './lexer';
import { findCycles, Graph } from './algos';

export const DEFAULT_MAXIMUM = Number.POSITIVE_INFINITY;

export type StateMap = { [name: string]: number };

type FormulaDefinition = string | number | FormulaToken;

/**
 * Formulas are the core unit of computation in models,
 * and also serve as the interface between lexed formula
 * definitions and the underlying models.
 */
export class Formula {
  public lexed: FormulaToken;
  public default: number;

  constructor(definition: FormulaDefinition, defaultValue: number = 0) {
    if (typeof definition === 'string') {
      this.lexed = lexer.lexFormula(definition);
    } else if (typeof definition === 'number') {
      // Handle infinity specially
      if (definition === Number.POSITIVE_INFINITY) {
        this.lexed = lexer.lexFormula('inf');
      } else {
        this.lexed = lexer.lexFormula(String(definition));
      }
    } else {
      this.lexed = definition;
    }

    this.default = defaultValue;
    this.validate();
  }

  /**
   * Ensure formula is mathematically coherent.
   */
  validate(): void {
    if (Array.isArray(this.lexed)) {
      const tokens = this.lexed[1];
      if (tokens.length === 0) {
        throw new InvalidFormula(this, 'formula is empty. must specify a number or a reference');
      }

      let prevKind: string | null = null;
      for (const [kind, val] of tokens) {
        if (kind === TOKEN_OP) {
          if (prevKind === null) {
            throw new InvalidFormula(this, "can't start with an operation");
          } else if (prevKind === TOKEN_OP) {
            throw new InvalidFormula(this, "operation can't be preceded by an operation");
          }
        } else if (prevKind !== null && prevKind !== TOKEN_OP) {
          throw new InvalidFormula(this, 'must have an operation between values or references');
        }
        prevKind = kind;
      }
      if (prevKind === TOKEN_OP) {
        throw new InvalidFormula(this, 'formula cannot end with an operation');
      }
    }
  }

  /**
   * Return list of all references in formula.
   */
  references(): string[] {
    const refs: string[] = [];
    if (Array.isArray(this.lexed)) {
      for (const [kind, val] of this.lexed[1]) {
        if (kind === TOKEN_REFERENCE) {
          refs.push(val);
        }
      }
    }
    return refs;
  }

  /**
   * Compute the value of the formula given a state.
   */
  compute(state: StateMap = {}): number {
    let acc: number | null = null;
    let op: string | null = null;
    const [, tokens] = this.lexed;

    // validate() has already ensured that this is a legal formula
    for (const token of tokens) {
      const [kind, valStr] = token;
      let val: number;

      if (kind === TOKEN_OP) {
        op = valStr;
        continue;
      }

      if (kind === TOKEN_WHOLE) {
        val = parseInt(valStr, 10);
      } else if (kind === TOKEN_INFINITY) {
        val = Number.POSITIVE_INFINITY;
      } else if (kind === TOKEN_DECIMAL) {
        val = parseFloat(valStr);
      } else if (kind === TOKEN_REFERENCE) {
        val = state[valStr];
      } else if (kind === TOKEN_FORMULA) {
        val = new Formula(token as FormulaDefinition).compute(state);
      } else {
        throw new Error('This should be unreachable');
      }

      if (acc === null) {
        acc = val;
      } else if (op === '/') {
        acc = acc / val;
      } else if (op === '*') {
        acc = acc * val;
      } else if (op === '+') {
        acc = acc + val;
      } else if (op === '-') {
        acc = acc - val;
      }
    }

    if (acc !== null) {
      return acc;
    }
    return this.default;
  }

  toString(): string {
    if (typeof this.lexed === 'number' || typeof this.lexed === 'string') {
      return `F(${String(this.lexed)})`;
    } else {
      return `F(${lexer.readable(this.lexed)})`;
    }
  }
}

/**
 * Stock represents a container that holds values.
 */
export class Stock {
  constructor(
    public name: string,
    public initial: Formula = new Formula(0),
    public maximum: Formula = new Formula(Number.POSITIVE_INFINITY),
    public show: boolean = true
  ) {}

  toString(): string {
    return `${this.constructor.name}(${this.name})`;
  }
}

/**
 * Base class for flow rates.
 */
export abstract class RateBase {
  public formula: Formula;

  constructor(formula: string | number | FormulaToken) {
    this.formula = new Formula(formula);
  }

  abstract calculate(state: StateMap, src: number, dest: number, capacity: number): [number, number];

  validateSource(sourceStock: Stock): void {
    // Default implementation does nothing
  }

  toString(): string {
    return `${this.constructor.name}(${this.formula})`;
  }
}

/**
 * Rate represents a fixed transfer per round.
 */
export class Rate extends RateBase {
  calculate(state: StateMap, src: number, dest: number, capacity: number): [number, number] {
    const evaluated = this.formula.compute(state);
    if (src > 0) {
      let change = src - evaluated >= 0 ? evaluated : src;
      change = Math.min(capacity, Math.max(0, change));
      return [change, change];
    }
    return [0, 0];
  }
}

/**
 * Conversion converts a stock into another at a discount rate.
 */
export class Conversion extends RateBase {
  calculate(state: StateMap, src: number, dest: number, capacity: number): [number, number] {
    const evaluated = this.formula.compute(state);
    let maxSrcChange: number;

    if (dest === Number.POSITIVE_INFINITY || capacity === Number.POSITIVE_INFINITY) {
      maxSrcChange = src;
    } else {
      maxSrcChange = Math.max(0, Math.floor((capacity - dest) / evaluated));
    }

    const change = Math.floor(maxSrcChange * evaluated);
    if (change === 0) {
      return [0, 0];
    }
    return [maxSrcChange, change];
  }

  validateSource(sourceStock: Stock): void {
    if (sourceStock.initial.compute() === Number.POSITIVE_INFINITY) {
      throw new IllegalSourceStock(this, sourceStock);
    }
  }
}

/**
 * Leak represents a stock leaking a percentage of its value into another.
 */
export class Leak extends RateBase {
  calculate(state: StateMap, src: number, dest: number, capacity: number): [number, number] {
    const evaluated = this.formula.compute(state);
    let change = Math.floor(src * evaluated);
    if (!isNaN(capacity)) {
      change = Math.min(capacity, change);
    }
    return [change, change];
  }

  validateSource(sourceStock: Stock): void {
    if (sourceStock.initial.compute() === Number.POSITIVE_INFINITY) {
      throw new IllegalSourceStock(this, sourceStock);
    }
  }
}

/**
 * Flow connects two stocks with a rate.
 */
export class Flow {
  constructor(public source: Stock, public destination: Stock, public rate: RateBase) {
    this.rate.validateSource(this.source);
  }

  change(state: StateMap, sourceState: number, destState: number): [number, number] {
    const capacity = this.destination.maximum.compute(state);
    const adjustedCapacity = destState !== Number.POSITIVE_INFINITY ? capacity - destState : capacity;
    return this.rate.calculate(state, sourceState, destState, adjustedCapacity);
  }

  toString(): string {
    return `${this.constructor.name}(${this.source} to ${this.destination} at ${this.rate})`;
  }
}

/**
 * State tracks the current state of all stocks.
 */
export class State {
  public state: StateMap = {};

  constructor(public model: Model) {
    // Initialize stocks not in initial path
    for (const stock of this.model.stocks) {
      if (!this.model.initialPath.includes(stock.name)) {
        this.state[stock.name] = stock.initial.compute(this.state);
      }
    }

    // Initialize stocks in initial path
    for (const name of this.model.initialPath) {
      const stock = this.model.getStock(name);
      if (stock) {
        this.state[stock.name] = stock.initial.compute(this.state);
      }
    }
  }

  /**
   * Advance the state by one round.
   */
  advance(): void {
    const deferred: Array<[string, number]> = [];

    // Process flows in reverse order
    for (let i = this.model.flows.length - 1; i >= 0; i--) {
      const flow = this.model.flows[i];
      const sourceState = this.state[flow.source.name];
      const destinationState = this.state[flow.destination.name];
      const [remChange, addChange] = flow.change(this.state, sourceState, destinationState);
      this.state[flow.source.name] -= remChange;
      deferred.push([flow.destination.name, addChange]);
    }

    // Apply deferred changes
    for (const [dest, change] of deferred) {
      this.state[dest] += change;
    }
  }

  /**
   * Create a snapshot of the current state.
   */
  snapshot(): StateMap {
    return { ...this.state };
  }
}

/**
 * Model contains and runs stocks and flows.
 */
export class Model {
  public stocks: Stock[] = [];
  public flows: Flow[] = [];
  public initialPath: string[] = [];

  constructor(public name: string) {}

  getStock(name: string): Stock | undefined {
    return this.stocks.find((stock) => stock.name === name);
  }

  infiniteStock(name: string): Stock {
    const s = new Stock(name, new Formula(Number.POSITIVE_INFINITY), undefined, false);
    this.stocks.push(s);
    return s;
  }

  stock(name: string, initial?: Formula, maximum?: Formula, show?: boolean): Stock {
    const s = new Stock(name, initial, maximum, show);
    this.stocks.push(s);
    return s;
  }

  flow(source: Stock, destination: Stock, rate: RateBase): Flow {
    const f = new Flow(source, destination, rate);
    this.flows.push(f);
    return f;
  }

  validate(): void {
    this.validateExistingStocks();
    this.validateInitialCycles();
  }

  /**
   * References in initial values must not have cycles.
   */
  validateInitialCycles(): void {
    const inwardRefs: Graph = {};
    const outwardRefs: Graph = {};

    for (const stock of this.stocks) {
      inwardRefs[stock.name] = [];
      outwardRefs[stock.name] = [];
    }

    for (const stock of this.stocks) {
      const refs = stock.initial.references();
      for (const ref of refs) {
        outwardRefs[stock.name].push(ref);
        inwardRefs[ref].push(stock.name);
      }
    }

    const { hasCycle, cycles, initialPath } = findCycles(inwardRefs, outwardRefs);
    if (hasCycle) {
      throw new CircularReferences(cycles, outwardRefs);
    }
    this.initialPath = initialPath;
  }

  /**
   * All references should point to existing stocks.
   */
  validateExistingStocks(): void {
    const stockNames = this.stocks.map((s) => s.name);
    const refs: Array<[Formula, string]> = [];

    for (const stock of this.stocks) {
      for (const ref of stock.maximum.references()) {
        refs.push([stock.maximum, ref]);
      }
      for (const ref of stock.initial.references()) {
        refs.push([stock.initial, ref]);
      }
    }

    for (const flow of this.flows) {
      for (const ref of flow.rate.formula.references()) {
        refs.push([flow.rate.formula, ref]);
      }
    }

    for (const [formula, ref] of refs) {
      if (!stockNames.includes(ref)) {
        throw new InvalidFormula(formula, `reference to non-existent stock '${ref}'`);
      }
    }
  }

  /**
   * Run the model for a specified number of rounds.
   */
  run(rounds: number = 10): StateMap[] {
    this.validate();

    const s = new State(this);
    const snapshots: StateMap[] = [s.snapshot()];

    for (let i = 0; i < rounds; i++) {
      s.advance();
      snapshots.push(s.snapshot());
    }

    return snapshots;
  }

  /**
   * Render results to string from Model run.
   */
  render(results: StateMap[], sep: string = '\t', pad: boolean = true): string {
    const lines: string[] = [];
    const colStocks = this.stocks.filter((s) => s.show);

    let header = sep;
    header += colStocks.map((s) => s.name).join(sep);
    const colSize = colStocks.map((s) => s.name.length);
    lines.push(header);

    for (let i = 0; i < results.length; i++) {
      const snapshot = results[i];
      let row = `${i}`;

      for (let j = 0; j < colStocks.length; j++) {
        const col = colStocks[j];
        let num = String(snapshot[col.name]);

        if (pad) {
          num = num.padEnd(colSize[j]);
        }

        row += sep + num;
      }
      lines.push(row);
    }

    return lines.join('\n');
  }
}
