import { DatabaseInstance } from "../database/database_instance";
import { VersionController } from "../database/version_control/version_controller";

// ============ PUBLIC VARIABLES ============

export let version_controller: VersionController | null = null;

export let db_manager: DatabaseInstance | null = null;

// ============ PUBLIC CONSTS ============

/// @brief Set the global database manager instance
/// @param db: The database instance to set as the manager
export const setDbManager = (db: DatabaseInstance | null) => {
  db_manager = db;
  version_controller = db!.version_controller;
};
