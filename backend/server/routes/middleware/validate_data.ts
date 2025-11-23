import { Request, Response } from "express";

// ============ PUBLIC CONSTS ============

/// @brief Validates that the request body contains a valid data object
/// @param req: The request object
/// @param res: The response object
/// @param next: The next middleware function
export const validateData = (req: Request, res: Response, next: () => void) => {
  const { metadata, ...data } = req.body ?? {};

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({ error: "Data must be an object" });
  }

  next();
};
