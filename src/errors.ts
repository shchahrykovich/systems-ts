/**
 * Custom exceptions for the systems package.
 */

export class SystemsException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SystemsException';
  }
}

export class ParseException extends SystemsException {
  constructor(message: string) {
    super(message);
    this.name = 'ParseException';
  }
}

export class IllegalSystemException extends SystemsException {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalSystemException';
  }
}

export class IllegalStockName extends SystemsException {
  constructor(public stockName: string, public allowed: string) {
    super(`name '${stockName}' is not a legal stock name, must be of format ${allowed}`);
    this.name = 'IllegalStockName';
  }
}

export class IllegalSourceStock extends IllegalSystemException {
  constructor(public rate: any, public source: any) {
    super(`stock '${source}' cannot be used as source for rate '${rate}'`);
    this.name = 'IllegalSourceStock';
  }
}

export class FormulaError extends IllegalSystemException {
  constructor(public formula: any) {
    super(`${FormulaError.name} for formula '${formula}'`);
    this.name = 'FormulaError';
  }
}

export class CircularReferences extends IllegalSystemException {
  constructor(public cycle: any, public graph: any) {
    super(`found cycle '${JSON.stringify(cycle)}' in references '${JSON.stringify(graph)}'`);
    this.name = 'CircularReferences';
  }
}

export class InvalidFormula extends IllegalSystemException {
  constructor(public formula: any, public msg: string) {
    super(`illegal formula '${formula}' due to '${msg}'`);
    this.name = 'InvalidFormula';
  }
}

export class ParseError extends ParseException {
  constructor(
    public line: any = '',
    public lineNumber: number = 0,
    public exception: Error | null = null
  ) {
    let message = `line ${lineNumber} could not be parsed: "${line}"`;
    if (exception !== null) {
      message += '\n' + exception.toString();
    }
    super(message);
    this.name = 'ParseError';
  }
}

export class DeferLineInfo extends ParseError {
  constructor(line: any = '', lineNumber: number = 0, exception: Error | null = null) {
    super(line, lineNumber, exception);
    this.name = 'DeferLineInfo';
  }
}

export class InvalidParameters extends DeferLineInfo {
  constructor(public txt: string, line: any = '', lineNumber: number = 0) {
    super(line, lineNumber);
    this.name = 'InvalidParameters';
  }

  toString(): string {
    return `line ${this.lineNumber} specifies invalid parameters '${this.txt}': "${this.line}"`;
  }
}

export class ConflictingValues extends DeferLineInfo {
  constructor(
    public stockName: string,
    public first: any,
    public second: any,
    line: any = '',
    lineNumber: number = 0
  ) {
    super(line, lineNumber);
    this.name = 'ConflictingValues';
  }

  toString(): string {
    if (this.lineNumber || this.line) {
      return `line ${this.lineNumber} initializes ${this.stockName} with conflicting value ${this.second} (was ${this.first}): "${this.line}"`;
    } else {
      return `'${this.stockName}' initialized with conflicting value ${this.second} (was ${this.first})`;
    }
  }
}

export class UnknownFlowType extends DeferLineInfo {
  constructor(public flowType: string, line: any = '', lineNumber: number = 0) {
    super(line, lineNumber);
    this.name = 'UnknownFlowType';
  }

  toString(): string {
    return `line ${this.lineNumber} has invalid flow type "${this.flowType}": "${this.line}"`;
  }
}
