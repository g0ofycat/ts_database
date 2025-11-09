import express, { Request, Response } from "express";
import { DatabaseManager } from "../database/database_manager";

// ============ INIT ============

let db_manager: DatabaseManager | null = null;

const app = express();

app.use(express.json());

// ======= API KEY OPERATOR =======

app.post("/set_api_key", (req: Request, res: Response) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "API key is required" });
  }

  try {
    db_manager = new DatabaseManager(apiKey);
    return res.json({ success: true, message: "API key set successfully" });
  } catch (err) {
    console.error("Failed to initialize database:", err);
    return res.status(401).json({ error: "Invalid API key" });
  }
});

// ======= MIDDLEWARE =======

const validateData = (req: Request, res: Response, next: () => void) => {
  const { metadata, ...data } = req.body ?? {};

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({ error: "Data must be an object" });
  }

  next();
};

const requireDatabase = (req: Request, res: Response, next: () => void) => {
  if (!db_manager && req.path !== "/set_api_key") {
    return res.status(403).json({ error: "API key not set" });
  }

  next();
};

app.use(requireDatabase);

// ======= INSERT OPERATOR =======

app.post("/insert", validateData, async (req: Request, res: Response) => {
  try {
    const id = await db_manager!.insert(req.body, req.body.metadata);

    res.json({ id });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ error: "Failed to insert data" });
  }
});

app.post("/insert_temp", validateData, async (req: Request, res: Response) => {
  try {
    const id = await db_manager!.insert_temp(
      req.body.timeout,
      req.body,
      req.body.metadata
    );

    res.json({ id });
  } catch (error) {
    console.error("Error inserting temporary data:", error);
    res.status(500).json({ error: "Failed to insert temporary data" });
  }
});

// ======= GET OPERATOR =======

app.get("/get/:id", (req: Request, res: Response) => {
  try {
    const record = db_manager!.get(Number(req.params.id));

    if (record) {
      res.json(record);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// ======= FILTER OPERATOR =======

app.post("/filter", (req: Request, res: Response) => {
  try {
    const result = db_manager!.filter(req.body);

    res.json(result);
  } catch (error) {
    console.error("Error filtering data:", error);
    res.status(500).json({ error: "Failed to filter data" });
  }
});

// ======= UPDATE OPERATOR =======

app.patch("/update/:id", async (req: Request, res: Response) => {
  try {
    const success = await db_manager!.update(Number(req.params.id), req.body);

    res.json({ success });
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).json({ error: "Failed to update data" });
  }
});

// ======= DELETE OPERATOR =======

app.delete("/delete/:id", async (req: Request, res: Response) => {
  try {
    const success = await db_manager!.delete(Number(req.params.id));

    res.json({ success });
  } catch (error) {
    console.error("Error deleting data:", error);
    res.status(500).json({ error: "Failed to delete data" });
  }
});

// ======= ALL OPERATOR =======

app.get("/all", (_: Request, res: Response) => {
  try {
    res.json(db_manager!.all());
  } catch (error) {
    console.error("Error fetching all data:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// ======= CANCEL TEMP DELETE OPERATOR =======

app.patch("/cancel_temp/:id", async (req: Request, res: Response) => {
  try {
    const success = await db_manager!.cancel_temp_delete(Number(req.params.id));

    res.json({ success });
  } catch (error) {
    console.error("Error canceling temporary deletion:", error);
    res.status(500).json({ error: "Failed to cancel temporary deletion" });
  }
});

// ======= VERSION CONTROL OPERATORS =======

app.post("/versions/create/:name", async (req: Request, res: Response) => {
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

app.post("/versions/load/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    await db_manager!.loadVersion(name!);

    res.json({
      success: true,
      message: `Database restored to version "${name}"`,
    });
  } catch (error) {
    console.error("Error restoring version:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to restore version",
    });
  }
});

app.delete("/versions/delete/:name", async (req: Request, res: Response) => {
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

app.get("/versions", (_: Request, res: Response) => {
  try {
    const versions = db_manager!.listVersions();

    res.json({ versions });
  } catch (error) {
    console.error("Error listing versions:", error);
    res.status(500).json({ error: "Failed to list versions" });
  }
});

// ======= START SERVER =======

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
