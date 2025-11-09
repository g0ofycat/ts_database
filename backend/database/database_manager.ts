import fs from "fs";
import path from "path";
import dotenv from "dotenv";

import { VersionController } from "./version_control/version_controller";
import { DataIndex, LogRecord } from "./types/database_types";

// ============ INIT ============

dotenv.config();

// ============ database_manager.ts ============

export class DatabaseManager {
  // ============ PRIVATE DATA ============

  private storage: DataIndex[] = [];

  private index: Map<number, DataIndex> = new Map();
  private timeout_data: Map<number, NodeJS.Timeout> = new Map();

  private data_map: Map<string, Map<any, Set<number>>> = new Map();
  private metadata_map: Map<string, Map<any, Set<number>>> = new Map();

  public current_id = 0;
  private file_size_limit = 0;

  private file_path: string;
  private version_controller: VersionController;

  // ============ CONSTRUCTOR ============

  /// @brief Constructor for Database
  /// @param api_key: The API key
  /// @param skip_load: Whether to skip database loading
  /// @param file_path: Name of the file to save the data to
  /// @param file_size_limit: The size of each file in bytes before creating a new one
  /// @param version_base_dir?: Base directory of the version
  constructor(
    api_key: string,
    skip_load = false,
    file_path = path.join(
      __dirname,
      "../data_versions/default",
      "database_data.json"
    ),
    file_size_limit = 100000,
    version_base_dir?: string
  ) {
    if (api_key !== process.env.DATABASE_API_KEY) {
      throw new Error("Invalid API key");
    }

    this.file_path = path.resolve(file_path);
    this.version_controller = new VersionController(version_base_dir);
    this.file_size_limit = file_size_limit;

    if (!skip_load) {
      this.load_async().catch((err) =>
        console.error("Error loading data:", err)
      );
    }
  }

  // ============ PERSISTENCE ============

  /// @brief Appends certain actions to the file
  /// @param log
  /// @return Promise<void>
  private async log_async(log: LogRecord): Promise<void> {
    const currentFile = await this.getCurrentFile();
    const logText = JSON.stringify(log, null, 2);

    const stat = await fs.promises.stat(currentFile);
    const isEmpty = stat.size === 0;

    if (isEmpty) {
      await fs.promises.writeFile(currentFile, `[\n${logText}\n]`);
    } else {
      const data = (await fs.promises.readFile(currentFile, "utf-8")).trim();
      const newData = data.slice(0, -1) + `,\n${logText}\n]`;

      await fs.promises.writeFile(currentFile, newData);
    }

    this.applyLog(log);
  }

  /// @brief Load data from a file
  /// @return Promise<void>
  private async load_async(): Promise<void> {
    const dir = path.dirname(this.file_path);
    const base = path.basename(this.file_path, ".json");

    try {
      await fs.promises.mkdir(dir, { recursive: true });

      const files = (await fs.promises.readdir(dir)).filter((f) =>
        f.startsWith(base + "_")
      );

      for (const file of files) {
        const file_path = path.join(dir, file);
        const raw = await fs.promises.readFile(file_path, "utf-8");

        if (!raw.trim()) continue;

        try {
          const logs: LogRecord[] = JSON.parse(raw);

          await this.applyLogs(logs);
        } catch (err) {
          console.error(`Failed to parse file ${file_path}:`, err);
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

        this.indexFields(this.data_map, log.data, ["metadata"], true);
        this.indexFields(this.metadata_map, log.data.metadata ?? {}, [], true);

        break;

      case "update":
        const record = this.index.get(log.id);

        if (record) {
          this.removeIndex(this.data_map, record, ["metadata"]);
          if (record.metadata)
            this.removeIndex(this.metadata_map, record.metadata, []);
          Object.assign(record, log.changes);
          this.indexFields(this.data_map, record, ["metadata"], true);
          if (record.metadata)
            this.indexFields(this.metadata_map, record.metadata, [], true);
        }

        break;

      case "delete":
        const toDelete = this.index.get(log.id);

        if (toDelete) {
          this.removeIndex(this.data_map, toDelete, ["metadata"]);

          if (toDelete.metadata)
            this.removeIndex(this.metadata_map, toDelete.metadata, []);
        }

        this.index.delete(log.id);
        this.storage = this.storage.filter((r) => r.id !== log.id);

        break;
    }
  }

  /// @brief Return the data inside of the file
  /// @return Promise<string>
  private async getCurrentFile(): Promise<string> {
    const dir = path.dirname(this.file_path);
    const base = path.basename(this.file_path, ".json");

    await fs.promises.mkdir(dir, { recursive: true });

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

    let currentFile: string;

    if (lastIndex === -1) {
      currentFile = path.join(dir, `${base}_0.json`);
      await fs.promises.writeFile(currentFile, "");
    } else {
      const lastFilePath = path.join(dir, `${base}_${lastIndex}.json`);
      const stat = await fs.promises.stat(lastFilePath);

      if (stat.size < this.file_size_limit) {
        currentFile = lastFilePath;
      } else {
        currentFile = path.join(dir, `${base}_${lastIndex + 1}.json`);
        await fs.promises.writeFile(currentFile, "");
      }
    }

    return currentFile;
  }

  // ============ INDEXING ============

  /// @brief Indexes the fields of an object into a Map
  /// @param map: The outer map
  /// @param obj: The objects that should be indexed
  /// @param excludeKeys: Optional list of keys to skip removal
  /// @param add: If true, adds the ID to the index; if false, removes it
  private indexFields(
    map: Map<string, Map<any, Set<number>>>,
    obj: Record<string, any>,
    excludeKeys: string[] = [],
    add: boolean
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      if (excludeKeys.includes(key)) continue;

      if (!map.has(key)) map.set(key, new Map());

      const valueMap = map.get(key)!;

      if (!valueMap.has(value)) valueMap.set(value, new Set());

      if (add) {
        valueMap.get(value)!.add(obj.id);
      } else {
        valueMap.get(value)!.delete(obj.id);
        if (valueMap.get(value)!.size === 0) valueMap.delete(value);
      }
    }
  }

  /// @brief Removes an object's fields from the index map
  /// @param map: The outer map
  /// @param obj: The objects index that should be removed
  /// @param excludeKeys: Optional list of keys to skip removal
  private removeIndex(
    map: Map<string, Map<any, Set<number>>>,
    obj: Record<string, any>,
    excludeKeys: string[] = []
  ): void {
    this.indexFields(map, obj, excludeKeys, false);
  }

  // ============ BASIC OPERATIONS ============

  /// @brief Insert operator
  /// @param data: The data to add
  /// @param metadata: Any metadata to add
  /// @return Promise<number>: The ID of the inserted data
  async insert(data: Omit<DataIndex, "id">, metadata?: any): Promise<number> {
    const id = this.current_id++;

    const new_data: DataIndex = { id, ...data, metadata };

    await this.log_async({ type: "insert", data: new_data });

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

    await this.log_async({ type: "insert", data: new_data });

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

    const idSets: Set<number>[] = [];

    for (const [key, value] of Object.entries(filter)) {
      let map = key === "metadata" ? this.metadata_map : this.data_map;

      const valueMap = map.get(key);

      if (!valueMap || !valueMap.has(value)) return [];

      idSets.push(valueMap.get(value)!);
    }

    if (idSets.length === 0) return [];

    const ids = idSets.reduce(
      (a, b) => new Set([...a].filter((x) => b.has(x)))
    );

    return [...ids].map((id) => this.index.get(id)!);
  }

  /// @brief Update operator
  /// @param id: The ID of the data
  /// @param updates: The updates to the data
  /// @return Promise<boolean>: If the update worked
  async update(id: number, updates: Partial<DataIndex>): Promise<boolean> {
    const record = this.index.get(id);

    if (!record) return false;

    this.removeIndex(this.data_map, record, ["metadata"]);

    if (record.metadata)
      this.removeIndex(this.metadata_map, record.metadata, []);

    Object.assign(record, updates);

    this.indexFields(this.data_map, record, ["metadata"], true);

    if (record.metadata)
      this.indexFields(this.metadata_map, record.metadata, [], true);

    await this.log_async({ type: "update", id, changes: updates });

    return true;
  }

  /// @brief Delete operator
  /// @param id: The ID of the data
  /// @return Promise<boolean>: If the deletion worked
  async delete(id: number): Promise<boolean> {
    if (!this.index.has(id)) return false;

    await this.log_async({ type: "delete", id });

    return true;
  }

  /// @brief Return shallow copy of the current storage
  /// @return DataIndex[]
  all(): DataIndex[] {
    return [...this.storage];
  }

  // ============ VERSION CONTROL OPERATIONS ============

  /// @brief Create an empty version (no data)
  /// @param versionName: Name for this empty version
  /// @return Promise<void>
  async createEmptyVersion(versionName: string): Promise<void> {
    await this.version_controller.createEmptyVersion(versionName);
  }

  /// @brief Create a snapshot of the current database state
  /// @param versionName: Name for this version
  /// @param chunkSize: Optional chunk size for large databases
  /// @return Promise<void>
  async createVersion(versionName: string, chunkSize = 500): Promise<void> {
    await this.version_controller.createVersion(this, versionName, chunkSize);
  }

  /// @brief Load database to a previous version
  /// @param versionName: Name of the version to restore
  /// @warning: This will replace current data
  /// @return Promise<void>
  async loadVersion(versionName: string): Promise<void> {
    const versionDb = await this.version_controller.loadVersion(versionName);

    const allIds = this.all().map((record) => record.id);

    for (const id of allIds) {
      await this.delete(id);
    }

    const versionData = versionDb.all();

    for (const record of versionData) {
      const { id, metadata, ...data } = record;

      await this.insert(data, metadata);
    }
  }

  /// @brief Delete a saved version
  /// @param versionName: Name of the version to delete
  /// @return Promise<boolean>
  async deleteVersion(versionName: string): Promise<boolean> {
    return await this.version_controller.deleteVersion(versionName);
  }

  /// @brief List all saved versions for this database
  /// @return string[]
  listVersions(): string[] {
    return this.version_controller.listVersions();
  }

  // ============ UTILITY OPERATIONS ============

  /// @brief Bulk apply logs
  /// @param logs: List of LogRecord
  /// @return Promise<void>
  async applyLogs(logs: LogRecord[]): Promise<void> {
    for (const log of logs) {
      this.applyLog(log);
    }
  }
}
