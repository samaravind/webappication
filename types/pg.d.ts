declare module 'pg' {
  export type QueryResult<Row = unknown> = {
    rows: Row[];
    rowCount: number | null;
  };

  export class Pool {
    constructor(config?: {
      connectionString?: string;
      ssl?: { rejectUnauthorized?: boolean };
    });

    query<Row = unknown>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<Row>>;
  }
}
