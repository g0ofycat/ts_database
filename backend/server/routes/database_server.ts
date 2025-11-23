import express from "express";

import { DatabaseInstance } from "../../database/database_instance";
import { setDbManager } from "./shared_database";

import { requireAPIKey } from "./middleware/require_API_key";
import { requireDatabase } from "./middleware/require_database";

import { reloadWebsite, interval_ms } from "../misc/database_pinger";

import dataRoutes from "./data/data_routes";
import versionRoutes from "./data/version_routes";

// ============ INIT ============

const app = express();

app.use(express.json());

setInterval(reloadWebsite, interval_ms);

// ============ API KEY INIT ============

app.post("/set_api_key", (req, res) => {
  const { apiKey } = req.body;
  setDbManager(new DatabaseInstance(apiKey));
  res.json({ success: true });
});

// ============ SECURITY INIT ============

app.use(requireDatabase);
app.use(requireAPIKey);

app.use("/", dataRoutes);
app.use("/versions", versionRoutes);

// ============ SERVER INIT ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
