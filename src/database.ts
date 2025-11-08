import fs from "fs";
import path from "path";

import { DataIndex, LogRecord } from "./types/database_types";

export class Database {
  // ============ PRIVATE DATA ============

  private storage: DataIndex[] = [];
  private index: Map<number, DataIndex> = new Map();
  private timeout_data: Map<number, NodeJS.Timeout> = new Map();
  private filePath: string;
  private current_id = 0;
  private file_size_limit = 0;

  // ============ CONSTRUCTOR ============

  /// @brief Constructor for Database
  /// @param filename: Name of the file to save the data to
  /// @param file_size_limit: The size of each file in bytes before creating a new one
  constructor(filename = "database_data.json", file_size_limit = 10000) {
    this.filePath = path.resolve(filename);
    this.file_size_limit = file_size_limit;

    this.load_async().catch((err) => console.error("Error loading data:", err));
  }

  // ============ PERSISTENCE ============

  /// @brief Appends certain actions to the file
  /// @param log
  /// @return Promise<void>
  private async save_async(log: LogRecord): Promise<void> {
    const currentFile = await this.getCurrentFile();

    try {
      await fs.promises.appendFile(currentFile, JSON.stringify(log) + "\n");
    } catch (err) {
      console.error("Error writing to file:", err);
      throw err;
    }

    this.applyLog(log);
  }

  /// @brief Load data from a file
  /// @return Promise<void>
  private async load_async(): Promise<void> {
    const dir = path.dirname(this.filePath);
    const base = path.basename(this.filePath, ".json");

    try {
      await fs.promises.mkdir(dir, { recursive: true });

      const files = (await fs.promises.readdir(dir)).filter((f) =>
        f.startsWith(base + "_")
      );

      for (const file of files) {
        const filePath = path.join(dir, file);
        const data = await fs.promises.readFile(filePath, "utf-8");
        const lines = data.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;

          const log: LogRecord = JSON.parse(line);
          this.applyLog(log);
        }
      }
    } catch (err) {
      console.error("Error loading data from file:", err);
      throw err;
    }
  }

  // ============ PRIVATE API ============

  /// @brief Apply data depending on the log
  /// @param log
  private applyLog(log: LogRecord): void {
    switch (log.type) {
      case "insert":
        this.storage.push(log.data);
        this.index.set(log.data.id, log.data);
        this.current_id = Math.max(this.current_id, log.data.id + 1);
        break;
      case "update":
        const record = this.index.get(log.id);
        if (record) Object.assign(record, log.changes);
        break;
      case "delete":
        this.index.delete(log.id);
        this.storage = this.storage.filter((r) => r.id !== log.id);
        break;
    }
  }

  /// @brief Return the data inside of the file
  /// @return Promise<string>
  private async getCurrentFile(): Promise<string> {
    const dir = path.dirname(this.filePath);
    const base = path.basename(this.filePath, ".json");

    try {
      await fs.promises.mkdir(dir, { recursive: true });
    } catch (err) {
      console.error("Error creating directory:", err);
      throw err;
    }

    try {
      const files = (await fs.promises.readdir(dir))
        .filter((f) => f.startsWith(base + "_"))
        .sort((a, b) => {
          const idxA = parseInt(a.match(/_(\d+)\.json$/)?.[1] || "0");
          const idxB = parseInt(b.match(/_(\d+)\.json$/)?.[1] || "0");
          return idxA - idxB;
        });

      const lastFile = files[files.length - 1];
      const lastIndex = lastFile
        ? parseInt(lastFile.match(/_(\d+)\.json$/)?.[1] ?? "0")
        : -1;

      let currentIndex = lastIndex + 1;
      let currentFile = path.join(dir, `${base}_${currentIndex}.json`);

      const lastFileStat = await fs.promises
        .stat(path.join(dir, `${base}_${lastIndex}.json`))
        .catch(() => null);

      if (!lastFileStat || lastFileStat.size < this.file_size_limit) {
        currentFile = path.join(dir, `${base}_${lastIndex + 1}.json`);
      }

      const fileExists = await fs.promises.stat(currentFile).catch(() => null);

      if (!fileExists) {
        await fs.promises.writeFile(currentFile, "[]");
      }

      return currentFile;
    } catch (err) {
      console.error("Error reading directory or processing files:", err);
      throw err;
    }
  }

  // ============ BASIC OPERATIONS ============

  /// @brief Insert operator
  /// @param data: The data to add
  /// @param metadata: Any metadata to add
  /// @return Promise<number>: The ID of the inserted data
  async insert(data: Omit<DataIndex, "id">, metadata?: any): Promise<number> {
    const id = this.current_id++;

    const new_data: DataIndex = { id, ...data, metadata };

    await this.save_async({ type: "insert", data: new_data });

    return id;
  }

  /// @param Insert temporary data
  /// @param duration: How long the data will last (seconds)
  /// @param data: The data to add
  /// @param metadata: Any metadata to add
  /// @return Promise<number>: The ID of the temporary data
  async insert_temp(
    duration: number,
    data: Omit<DataIndex, "id">,
    metadata?: any
  ): Promise<number> {
    const id = this.current_id++;
    const new_data: DataIndex = { id, ...data, metadata };

    await this.save_async({ type: "insert", data: new_data });

    this.storage.push(new_data);
    this.index.set(id, new_data);

    const timeoutId = setTimeout(async () => {
      await this.delete(id);
    }, duration * 1000);

    this.timeout_data.set(id, timeoutId);

    return id;
  }

  /// @brief Cancel the deletion of the temporary data
  /// @param id: The ID of the data
  /// @return Promise<boolean>: If the cancel worked
  async cancel_temp_delete(id: number): Promise<boolean> {
    const timeoutId = this.timeout_data.get(id);

    if (timeoutId) {
      clearTimeout(timeoutId);

      this.timeout_data.delete(id);

      console.log(`Temporary deletion of ID ${id} has been canceled.`);

      return true;
    }

    return false;
  }

  /// @brief Get operator
  /// @param id: The ID of the data
  /// @return DataIndex | null
  get(id: number): DataIndex | null {
    return this.index.get(id) ?? null;
  }

  /// @brief Filter operator
  /// @param filter?: The filter to apply
  /// @return DataIndex[]: List of indexes that match
  filter(filter?: Partial<DataIndex>): DataIndex[] {
    if (!filter) return this.storage;

    if ("id" in filter && filter.id !== undefined) {
      const record = this.index.get(filter.id);
      return record ? [record] : [];
    }

    return this.storage.filter((r) =>
      Object.entries(filter).every(([k, v]) => r[k] === v)
    );
  }

  /// @brief Update operator
  /// @param id: The ID of the data
  /// @param updates: The updates to the data
  /// @return Promise<boolean>: If the update worked
  async update(id: number, updates: Partial<DataIndex>): Promise<boolean> {
    const record = this.index.get(id);

    if (!record) return false;

    await this.save_async({ type: "update", id, changes: updates });

    return true;
  }

  /// @brief Delete operator
  /// @param id: The ID of the data
  /// @return Promise<boolean>: If the deletion worked
  async delete(id: number): Promise<boolean> {
    if (!this.index.has(id)) return false;

    await this.save_async({ type: "delete", id });

    return true;
  }

  /// @brief Return shallow copy of the current storage
  /// @return DataIndex[]
  all(): DataIndex[] {
    return [...this.storage];
  }
}
