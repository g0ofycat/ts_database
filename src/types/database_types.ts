export type DataIndex = { id: number; [key: string]: any; metadata: any };

export type LogRecord =
  | { type: "insert"; data: DataIndex }
  | { type: "update"; id: number; changes: Partial<DataIndex> }
  | { type: "delete"; id: number };
