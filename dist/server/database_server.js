"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../src/database");
// ======= CONSTS =======
const app = (0, express_1.default)();
const database = new database_1.Database();
app.use(express_1.default.json());
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
//# sourceMappingURL=database_server.js.map