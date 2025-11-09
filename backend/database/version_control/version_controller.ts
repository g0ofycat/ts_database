import fs from "fs";
import path from "path";
import { DatabaseManager } from "../database_manager";

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
    db: DatabaseManager,
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

  /// @brief Loads a version
  /// @param version: The name of the version
  /// @return Promise<Database>: The database
  async loadVersion(version: string): Promise<DatabaseManager> {
    const dir = path.join(this.baseDir, version);
    if (!fs.existsSync(dir)) throw new Error("Version does not exist");

    const db = new DatabaseManager(process.env.DATABASE_API_KEY!, true);

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json") && f !== "metadata.json")
      .sort((a, b) => {
        const idxA = parseInt(a.match(/_(\d+)\.json$/)?.[1] ?? "0");
        const idxB = parseInt(b.match(/_(\d+)\.json$/)?.[1] ?? "0");
        return idxA - idxB;
      });

    for (const file of files) {
      try {
        const raw = (
          await fs.promises.readFile(path.join(dir, file), "utf-8")
        ).trim();
        if (!raw) continue;

        const data = JSON.parse(raw);

        if (!Array.isArray(data)) {
          console.warn(`[VersionController] Skipped non-array file: ${file}`);
          continue;
        }

        await db.applyLogs(data);
      } catch (err) {
        console.error(`[VersionController] Failed to load ${file}:`, err);
      }
    }

    return db;
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
}
