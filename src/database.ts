import * as fs from "fs";
import * as path from "path";

import { DataIndex } from "./types/database_types";

export class Database {
  // ============ PRIVATE DATA ============

  private storage: DataIndex[] = [];
  private current_id = 0;
  private filePath: string;

  // ============ CONSTRUCTOR ============

  constructor(filename = "database_data.json") {
    this.filePath = path.resolve(filename);
    this.load();
  }

  // ============ PERSISTENCE ============

  /// @brief Write data to the file
  private save(): void {
    const dir = path.dirname(this.filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      this.filePath,
      JSON.stringify(
        {
          current_id: this.current_id,
          storage: this.storage,
        },
        null,
        2
      )
    );
  }

  /// @brief Load data from a file
  private load(): void {
    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);

      this.current_id = parsed.current_id ?? 0;

      this.storage = parsed.storage ?? [];
    } else {
      this.save();
    }
  }

  // ============ BASIC OPERATIONS ============

  /// @brief Insert operator
  /// @param data: The data to add
  /// @param metadata: Any metadata to add
  /// @return number: The ID of the inserted data
  insert(data: Omit<DataIndex, "id">, metadata?: any): number {
    const id = this.current_id++;

    const new_data: DataIndex = { id, ...data, metadata };

    this.storage.push(new_data);

    this.save();

    return id;
  }

  /// @brief Get operator
  /// @param id: The ID of the data
  /// @return DataIndex | null
  get(id: number): DataIndex | null {
    return this.storage.find((r) => r.id === id) || null;
  }

  /// @brief Filter operator
  /// @param filter?: The filter to apply
  /// @return DataIndex[]: List of indexes that match
  filter(filter?: Partial<DataIndex>): DataIndex[] {
    if (!filter) return this.storage;

    return this.storage.filter((r) =>
      Object.entries(filter).every(([k, v]) => r[k] === v)
    );
  }

  /// @brief Update operator
  /// @param id: The ID of the data
  /// @param updates: The updates to the data
  /// @return boolean: If the update worked
  update(id: number, updates: Partial<DataIndex>): boolean {
    const record = this.storage.find((r) => r.id === id);

    if (!record) return false;

    Object.assign(record, updates);

    this.save();

    return true;
  }

  /// @brief Delete operator
  /// @param id: The ID of the data
  /// @return boolean: If the deletion worked
  delete(id: number): boolean {
    const index = this.storage.findIndex((r) => r.id === id);

    if (index === -1) return false;

    this.storage.splice(index, 1);

    this.save();

    return true;
  }

  /// @brief Return shallow copy of the current storage
  /// @return DataIndex[]
  all(): DataIndex[] {
    return [...this.storage];
  }
}
