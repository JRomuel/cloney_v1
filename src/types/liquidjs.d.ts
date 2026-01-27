// Type declarations for liquidjs
// These will be overridden when the actual package is installed

declare module 'liquidjs' {
  export interface LiquidOptions {
    cache?: boolean;
    strictFilters?: boolean;
    strictVariables?: boolean;
    trimTagLeft?: boolean;
    trimTagRight?: boolean;
    trimOutputLeft?: boolean;
    trimOutputRight?: boolean;
    greedy?: boolean;
    lenientIf?: boolean;
  }

  export interface TagToken {
    args: string;
    name: string;
  }

  export interface TopLevelToken {
    kind: number;
    name?: string;
  }

  export interface Context {
    get(path: string[]): unknown;
    getAll(): Record<string, unknown>;
  }

  export interface Emitter {
    write(content: string): void;
  }

  export interface Template {
    // Template interface
  }

  export interface TagImplOptions {
    parse?(this: any, tagToken: TagToken, remainTokens?: TopLevelToken[]): void;
    render?(this: any, ctx: Context, emitter: Emitter): Promise<any> | any;
    [key: string]: any;
  }

  type FilterFunction = (...args: any[]) => any;

  export class Liquid {
    constructor(options?: LiquidOptions);

    registerFilter(name: string, filter: FilterFunction): void;
    registerTag(name: string, impl: TagImplOptions): void;
    parse(template: string): Template[];
    render(templates: Template[], context: Record<string, unknown>): Promise<string>;
    parseAndRender(template: string, context: Record<string, unknown>): Promise<string>;
  }
}
