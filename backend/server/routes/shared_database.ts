import { DatabaseInstance } from "../../database/database_instance";

// ============ PUBLIC VARIABLES ============

export let db_manager: DatabaseInstance | null = null;

// ============ PUBLIC CONSTS ============

/// @brief Set the global database manager instance
/// @param db: The database instance to set as the manager
export const setDbManager = (db: DatabaseInstance | null) => {
  db_manager = db;
};
