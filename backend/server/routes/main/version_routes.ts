import { Router, Request, Response } from "express";

import { db_manager, setDbManager } from "../../shared_database";

// ============ CONSTS ============

const router = Router();

// ============ ENDPOINTS ============

/// @brief Create a new empty version with the given name
/// @param req: The request object containing the name in the URL
/// @param res: The response object to send the success status
router.post("/create_empty/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Version name is required" });
    }

    await db_manager!.createEmptyVersion(name);

    res.json({
      success: true,
      message: `Empty version "${name}" created successfully`,
    });
  } catch (error) {
    console.error("Error creating empty version:", error);
    res.status(500).json({ error: "Failed to create empty version" });
  }
});

/// @brief Create a new version with the given name and chunk size
/// @param req: The request object containing the name in the URL and chunk size in the body
/// @param res: The response object to send the success status
router.post("/create/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { chunkSize } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Version name is required" });
    }

    await db_manager!.createVersion(name, chunkSize || 500);

    res.json({
      success: true,
      message: `Version "${name}" created successfully`,
    });
  } catch (error) {
    console.error("Error creating version:", error);
    res.status(500).json({ error: "Failed to create version" });
  }
});

/// @brief Load a version by name
/// @param req: The request object containing the name in the URL
/// @param res: The response object to send the success status
router.post("/load/:name", async (req: Request, res: Response) => {
  try {
    const version_name = req.params.name;

    setDbManager(await db_manager!.loadVersion(version_name!));

    res.json({
      success: true,
      message: `Database loaded and switched to version "${version_name}"`,
    });
  } catch (error) {
    console.error("Error loading version:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load version",
    });
  }
});

/// @brief Delete a version by name
/// @param req: The request object containing the name in the URL
/// @param res: The response object to send the success status
router.delete("/delete/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const success = await db_manager!.deleteVersion(name!);

    if (success) {
      res.json({
        success: true,
        message: `Version "${name}" deleted successfully`,
      });
    } else {
      res.status(404).json({ error: "Version not found" });
    }
  } catch (error) {
    console.error("Error deleting version:", error);
    res.status(500).json({ error: "Failed to delete version" });
  }
});

/// @brief Get a list of all versions
/// @param req: The request object
/// @param res: The response object to send the list of versions
router.get("/all", (_: Request, res: Response) => {
  try {
    const versions = db_manager!.listVersions();

    res.json({ versions });
  } catch (error) {
    console.error("Error listing versions:", error);
    res.status(500).json({ error: "Failed to list versions" });
  }
});

/// @brief Get metadata for a given version
/// @param req: The request object containing the name in the URL
/// @param res: The response object to send the metadata
router.get("/metadata/:name?", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const metadata = await db_manager!.getVersionMetadata(name);

    res.json({ success: true, metadata });
  } catch (error) {
    console.error("Error fetching version metadata:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch version metadata",
    });
  }
});

/// @brief Download JSON data for the current version
/// @param req: The request object containing the optional version name in the URL
/// @param res: The response object to send the JSON data as a file download
router.get("/download/:name?", async (req: Request, res: Response) => {
  try {
    const versionName = req.params.name ?? db_manager!.version_name;

    let dbInstance = db_manager!;

    if (versionName !== db_manager!.version_name) {
      dbInstance = await db_manager!.loadVersion(versionName);
    }

    const data = dbInstance.all();

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${versionName}.json"`
    );

    res.setHeader("Content-Type", "application/json");

    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error downloading version data:", err);
    res.status(500).json({ error: "Failed to download version data" });
  }
});

export default router;
