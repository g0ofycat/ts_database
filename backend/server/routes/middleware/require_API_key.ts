import { Request, Response } from "express";

import { db_manager } from "../../shared_database";

// ============ PUBLIC CONSTS ============

/// @brief Requires a valid API key for all routes except /set_api_key
/// @param req: The request object
/// @param res: The response object
/// @param next: The next middleware function
export const requireAPIKey = (req: Request, res: Response, next: () => void) => {
  if (req.path === "/set_api_key") return next();

  const clientKey = req.headers["api-key"];

  console.log(`Received request for ${req.path} with API key: ${clientKey}`
  );
  if (!clientKey) return res.status(401).json({ error: "Missing API key" });

  if (!db_manager) return res.status(403).json({ error: "API key not set" });

  if (!db_manager.isValidKey(clientKey.toString()))
    return res.status(401).json({ error: "Invalid API key" });

  next();
};
