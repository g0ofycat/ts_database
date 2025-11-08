import { DataIndex } from "./types/database_types";
export declare class Database {
    private storage;
    private current_id;
    private filePath;
    constructor(filename?: string);
    private save;
    private load;
    insert(data: Omit<DataIndex, "id">, metadata?: any): number;
    get(id: number): DataIndex | null;
    filter(filter?: Partial<DataIndex>): DataIndex[];
    update(id: number, updates: Partial<DataIndex>): boolean;
    delete(id: number): boolean;
    all(): DataIndex[];
}
//# sourceMappingURL=database.d.ts.map