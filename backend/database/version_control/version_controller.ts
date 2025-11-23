import fs from "fs";
import path from "path";

import { DatabaseInstance } from "../database_instance";

// ============ version_controller.ts ============

export class VersionController {
  // ============ PUBLIC DATA ============

  public baseDir: string;

  // ============ CONSTRUCTOR ============

  /// @brief Constructor for VersionController
  /// @param baseDir: Where to store all of the versions
  constructor(baseDir = path.join(__dirname, "../../data_versions")) {
    this.baseDir = path.resolve(baseDir);
  }

  // ============ VERSION CONTROL OPERATIONS ============

  /// @brief Create a new empty version (no data)
  /// @param version: The name of the new version
  /// @return Promise<void>
  async createEmptyVersion(version: string): Promise<void> {
    const dir = path.join(this.baseDir, version);

    await fs.promises.mkdir(dir, { recursive: true });

    const metadata = {
      timestamp: new Date().toISOString(),
      totalRecords: 0,
      chunks: 1,
    };

    await fs.promises.writeFile(
      path.join(dir, "metadata.json"),
      JSON.stringify(metadata, null, 2),
      "utf-8"
    );
  }

  /// @brief Create a new version
  /// @param db: The database to create a version of
  /// @param version: The name of the version
  /// @param lastId: The last ID of the written data
  /// @param chunkSize: How many lines of data to load for each chunk
  /// @return Promise<void>
  async createVersion(
    db: DatabaseInstance,
    version: string,
    chunkSize = 500
  ): Promise<void> {
    const dir = path.join(this.baseDir, version);

    await fs.promises.mkdir(dir, { recursive: true });

    const allLogs = db.all().map((data) => ({ type: "insert", data }));

    for (let i = 0; i < allLogs.length; i += chunkSize) {
      const chunk = allLogs.slice(i, i + chunkSize);
      const filePath = path.join(dir, `data_${Math.floor(i / chunkSize)}.json`);

      await fs.promises.writeFile(
        filePath,
        JSON.stringify(chunk, null, 2),
        "utf-8"
      );
    }

    const metadata = {
      created_from: db.version_name,
      timestamp: new Date().toISOString(),
      totalRecords: allLogs.length,
      chunks: Math.ceil(allLogs.length / chunkSize),
    };

    await fs.promises.writeFile(
      path.join(dir, "metadata.json"),
      JSON.stringify(metadata, null, 2),
      "utf-8"
    );
  }

  /// @brief Loads a version (creates a new Database if it doesn't exist)
  /// @param version: The name of the version
  /// @return Promise<Database>: The database
  async loadVersion(version: string): Promise<DatabaseInstance> {
    const dir = path.join(this.baseDir, version);

    if (!fs.existsSync(dir)) {
      await this.createEmptyVersion(version);
    }

    return new DatabaseInstance(process.env.DATABASE_API_KEY!, false, version);
  }

  /// @brief Delete a version
  /// @param version: The name of the version
  /// @return Promise<boolean>: True if deleted, false if version not found
  async deleteVersion(version: string): Promise<boolean> {
    const dir = path.join(this.baseDir, version);

    if (!fs.existsSync(dir)) return false;

    try {
      await fs.promises.rm(dir, { recursive: true, force: true });

      return true;
    } catch (error) {
      console.error(`Failed to delete version "${version}":`, error);

      return false;
    }
  }

  // ============ UTILITY OPERATIONS ============

  /// @brief List all versions
  /// @return string[]
  listVersions(): string[] {
    if (!fs.existsSync(this.baseDir)) return [];

    return fs
      .readdirSync(this.baseDir)
      .filter((f) => fs.statSync(path.join(this.baseDir, f)).isDirectory());
  }

  /// @brief Get metadata for a given version
  /// @param version: Name of the version
  /// @return Promise<Record<string, any>>: Parsed metadata object
  async getMetadata(version: string): Promise<Record<string, any>> {
    const metadataPath = path.join(this.baseDir, version, "metadata.json");

    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Metadata file not found for version "${version}"`);
    }

    const raw = await fs.promises.readFile(metadataPath, "utf-8");

    return JSON.parse(raw);
  }
}
