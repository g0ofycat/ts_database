import express, { Request, Response } from "express";

import { Database } from "../src/database";

// ======= CONSTS =======

const app = express();
const database = new Database();

app.use(express.json());

// ======= INSERT OPERATOR =======

app.post("/insert", (req: Request, res: Response) => {
  const id = database.insert(req.body);
  res.json({ id });
});

// ======= GET OPERATOR =======

app.get("/get/:id", (req: Request, res: Response) => {
  const record = database.get(Number(req.params.id));
  record ? res.json(record) : res.status(404).json({ error: "Not found" });
});

// ======= FILTER OPERATOR =======

app.post("/filter", (req: Request, res: Response) => {
  const result = database.filter(req.body);
  res.json(result);
});

// ======= UPDATE OPERATOR =======

app.patch("/update/:id", (req: Request, res: Response) => {
  const success = database.update(Number(req.params.id), req.body);
  res.json({ success });
});

// ======= DELETE OPERATOR =======

app.delete("/delete/:id", (req: Request, res: Response) => {
  const success = database.delete(Number(req.params.id));
  res.json({ success });
});

// ======= ALL OPERATOR =======

app.get("/all", (req: Request, res: Response) => res.json(database.all()));

// ======= START SERVER =======

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});