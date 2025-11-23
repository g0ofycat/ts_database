import { Router, Request, Response } from "express";

import { db_manager, setDbManager } from "../shared_database";

// ============ CONSTS ============

const router = Router();

// ============ ENDPOINTS ============

/// @brief Create a new empty version with the given name
/// @param req: The request object containing the name in the URL
/// @param res: The response object to send the success status
router.post("/create_empty/:name", async (req: Request, res: Response) => {
  const version_name = req.params.name;

  await db_manager!.createEmptyVersion(version_name!);

  res.json({ success: true });
});

/// @brief Create a new version with the given name and chunk size
/// @param req: The request object containing the name in the URL and chunk size in the body
/// @param res: The response object to send the success status
router.post("/create/:name", async (req: Request, res: Response) => {
  const { chunkSize } = req.body;

  const version_name = req.params.name;

  await db_manager!.createVersion(version_name!, chunkSize);

  res.json({ success: true });
});

/// @brief Load a version by name
/// @param req: The request object containing the name in the URL
/// @param res: The response object to send the success status
router.post("/load/:name", async (req: Request, res: Response) => {
  const version_name = req.params.name;

  setDbManager(await db_manager!.loadVersion(version_name!));

  res.json({ success: true });
});

/// @brief Delete a version by name
/// @param req: The request object containing the name in the URL
/// @param res: The response object to send the success status
router.delete("/delete/:name", async (req: Request, res: Response) => {
  const version_name = req.params.name;

  const success = await db_manager!.deleteVersion(version_name!);

  if (!success) return res.status(404).json({ error: "Version not found" });

  res.json({ success: true });
});

/// @brief Get a list of all versions
/// @param req: The request object
/// @param res: The response object to send the list of versions
router.get("/all", (_: Request, res: Response) => {
  res.json({ versions: db_manager!.listVersions() });
});

/// @brief Get metadata for a given version
/// @param req: The request object containing the name in the URL
/// @param res: The response object to send the metadata
router.get("/metadata/:name?", async (req: Request, res: Response) => {
  const metadata = await db_manager!.getVersionMetadata(req.params.name);
  res.json({ success: true, metadata });
});

export default router;
