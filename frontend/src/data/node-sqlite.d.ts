// Node's built-in SQLite (Node 22.13+), used only by tests to stand in for the phone's database.
// The few types the tests use, so the app does not need @types/node.
declare module 'node:sqlite' {
  export type SQLInputValue = null | number | bigint | string | Uint8Array;
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...parameters: SQLInputValue[]): unknown;
      all(...parameters: SQLInputValue[]): unknown[];
      get(...parameters: SQLInputValue[]): unknown;
    };
  }
}
