import { Router, Request, Response } from "express";

import { db_manager } from "../shared_database";
import { validateData } from "../middleware/validate_data";

// ============ CONSTS ============

const router = Router();

// ============ ENDPOINTS ============

/// @brief Insert a new record into the database
/// @param req: The request object containing the data and metadata in the body
/// @param res: The response object to send the ID of the inserted record
router.post("/insert", validateData, async (req: Request, res: Response) => {
  const id = await db_manager!.insert(req.body, req.body.metadata);

  res.json({ id });
});

/// @brief Insert a temporary record that will be automatically deleted after a timeout
/// @param req: The request object containing the data, timeout, and metadata in the body
/// @param res: The response object to send the ID of the inserted record
router.post(
  "/insert_temp",
  validateData,
  async (req: Request, res: Response) => {
    const id = await db_manager!.insert_temp(
      req.body,
      req.body.timeout,
      req.body.metadata
    );

    res.json({ id });
  }
);

/// @brief Get a record by ID
/// @param req: The request object containing the ID in the URL
/// @param res: The response object to send the record or an error if not found
router.get("/get/:id", (req: Request, res: Response) => {
  const record = db_manager!.get(Number(req.params.id));

  if (!record) return res.status(404).json({ error: "Not found" });

  res.json(record);
});

/// @brief Filter records based on query parameters
/// @param req: The request object containing the filter parameters in the body
/// @param res: The response object to send the filtered records
router.post("/filter", (req: Request, res: Response) => {
  res.json(db_manager!.filter(req.body));
});

/// @brief Update a record by ID with new data
/// @param req: The request object containing the ID in the URL and the new data in the body
/// @param res: The response object to send the success status
router.patch("/update/:id", async (req: Request, res: Response) => {
  res.json({
    success: await db_manager!.update(Number(req.params.id), req.body),
  });
});

/// @brief Delete a record by ID
/// @param req: The request object containing the ID in the URL
/// @param res: The response object to send the success status
router.delete("/delete/:id", async (req: Request, res: Response) => {
  res.json({ success: await db_manager!.delete(Number(req.params.id)) });
});

/// @brief Get all records in the database
/// @param req: The request object
/// @param res: The response object to send all records
router.get("/all", (_: Request, res: Response) => {
  res.json(db_manager!.all());
});

/// @brief Cancel a temporary record deletion by ID
/// @param req: The request object containing the ID in the URL
/// @param res: The response object to send the success status
router.patch("/cancel_temp/:id", async (req: Request, res: Response) => {
  res.json({
    success: await db_manager!.cancel_temp_delete(Number(req.params.id)),
  });
});

export default router;
