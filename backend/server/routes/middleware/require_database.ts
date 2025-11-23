import { Request, Response } from "express";

import { db_manager } from "../../shared_database";

// ============ PUBLIC CONSTS ============

/// @brief Requires a valid database instance for all routes except /set_api_key
/// @param req: The request object
/// @param res: The response object
/// @param next: The next middleware function
export const requireDatabase = (req: Request, res: Response, next: () => void) => {
  if (!db_manager && req.path !== "/set_api_key") {
    return res.status(403).json({ error: "API key not set" });
  }

  next();
};
