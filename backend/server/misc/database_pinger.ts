import axios from "axios";
import dotenv from "dotenv";

// ============ INIT ============

dotenv.config();

// ============ PRIVATE CONSTS ============

const url = `https://ts-database.onrender.com`;

// ============ PUBLIC CONSTS ============

export const interval_ms = 30000;

// ============ INIT ============

/// @brief Ping server every interval_ms
export function reloadWebsite() {
  axios
    .get(url, { headers: { ["api-key"]: process.env.DATABASE_API_KEY } })
    .then((response) => {
      console.log(
        `Reloaded at ${new Date().toISOString()}: Status Code ${
          response.status
        }`
      );
    })
    .catch((error) => {
      console.error(
        `Error reloading at ${new Date().toISOString()}:`,
        error.message
      );
    });
}
