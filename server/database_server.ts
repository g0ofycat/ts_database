import express from "express";

import { Database } from "../src/database";

// ======= CONSTS =======

const app = express();
const database = new Database();

app.use(express.json());

// ======= INSERT OPERATOR =======

app.post("/insert", (req, res) => {
  const id = database.insert(req.body);
  res.json({ id });
});

// ======= GET OPERATOR =======

app.get("/get/:id", (req, res) => {
  const record = database.get(Number(req.params.id));
  record ? res.json(record) : res.status(404).json({ error: "Not found" });
});

// ======= FILTER OPERATOR =======

app.post("/filter", (req, res) => {
  const result = database.filter(req.body);
  res.json(result);
});

// ======= UPDATE OPERATOR =======

app.patch("/update/:id", (req, res) => {
  const success = database.update(Number(req.params.id), req.body);
  res.json({ success });
});

// ======= DELETE OPERATOR =======

app.delete("/delete/:id", (req, res) => {
  const success = database.delete(Number(req.params.id));
  res.json({ success });
});

// ======= ALL OPERATOR =======

app.get("/all", (req, res) => res.json(database.all()));

// ======= START SERVER =======

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});