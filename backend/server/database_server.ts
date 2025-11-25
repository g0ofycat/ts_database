import express from "express";

import { DatabaseInstance } from "../database/database_instance";
import { setDbManager } from "./shared_database";

import { requireAPIKey } from "./routes/middleware/require_API_key";
import { requireDatabase } from "./routes/middleware/require_database";

import dataRoutes from "./routes/main/data_routes";
import versionRoutes from "./routes/main/version_routes";

// ============ INIT ============

const app = express();

app.use(express.json());

app.set("trust proxy", 1);

app.use(express.json({ limit: '1gb' }));

app.use(express.urlencoded({ limit: '1gb', extended: true }));

// ============ API KEY INIT ============

/// @brief Set the API key for the database connection
/// @param req: The request object containing the API key
/// @param res: The response object
app.post("/set_api_key", (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "API key is required" });
  }

  try {
    setDbManager(new DatabaseInstance(apiKey));

    return res.json({ success: true, message: "API key set successfully" });
  } catch (err) {
    console.error("Failed to initialize database:", err);

    return res.status(401).json({ error: "Invalid API key" });
  }
});

/// @brief Ping the server
/// @param _: The request object
/// @param res: The response object
app.get("/ping", (_, res) => {
  res.json({ success: true, message: "Pong!" });
});

// ============ SECURITY INIT ============

app.use(requireDatabase);
app.use(requireAPIKey);

app.use("/", dataRoutes);
app.use("/versions", versionRoutes);

// ============ SERVER INIT ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
