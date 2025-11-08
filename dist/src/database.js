"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Database {
    // ============ CONSTRUCTOR ============
    constructor(filename = "database_data.json") {
        // ============ PRIVATE DATA ============
        this.storage = [];
        this.current_id = 0;
        this.filePath = path.resolve(filename);
        this.load();
    }
    // ============ PERSISTENCE ============
    /// @brief Write data to the file
    save() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.filePath, JSON.stringify({
            current_id: this.current_id,
            storage: this.storage,
        }, null, 2));
    }
    /// @brief Load data from a file
    load() {
        if (fs.existsSync(this.filePath)) {
            const raw = fs.readFileSync(this.filePath, "utf-8");
            const parsed = JSON.parse(raw);
            this.current_id = parsed.current_id ?? 0;
            this.storage = parsed.storage ?? [];
        }
        else {
            this.save();
        }
    }
    // ============ BASIC OPERATIONS ============
    /// @brief Insert operator
    /// @param data: The data to add
    /// @param metadata: Any metadata to add
    /// @return number: The ID of the inserted data
    insert(data, metadata) {
        const id = this.current_id++;
        const new_data = { id, ...data, metadata };
        this.storage.push(new_data);
        this.save();
        return id;
    }
    /// @brief Get operator
    /// @param id: The ID of the data
    /// @return DataIndex | null
    get(id) {
        return this.storage.find((r) => r.id === id) || null;
    }
    /// @brief Filter operator
    /// @param filter?: The filter to apply
    /// @return DataIndex[]: List of indexes that match
    filter(filter) {
        if (!filter)
            return this.storage;
        return this.storage.filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v));
    }
    /// @brief Update operator
    /// @param id: The ID of the data
    /// @param updates: The updates to the data
    /// @return boolean: If the update worked
    update(id, updates) {
        const record = this.storage.find((r) => r.id === id);
        if (!record)
            return false;
        Object.assign(record, updates);
        this.save();
        return true;
    }
    /// @brief Delete operator
    /// @param id: The ID of the data
    /// @return boolean: If the deletion worked
    delete(id) {
        const index = this.storage.findIndex((r) => r.id === id);
        if (index === -1)
            return false;
        this.storage.splice(index, 1);
        this.save();
        return true;
    }
    /// @brief Return shallow copy of the current storage
    /// @return DataIndex[]
    all() {
        return [...this.storage];
    }
}
exports.Database = Database;
//# sourceMappingURL=database.js.map