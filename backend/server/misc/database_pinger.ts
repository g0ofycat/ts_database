import axios from "axios";

// ============ PRIVATE CONSTS ============

const url = `https://ts-database.onrender.com`;

// ============ PUBLIC CONSTS ============

export const interval_ms = 30000;

// ============ INIT ============

/// @brief Ping server every interval_ms
export function reloadWebsite() {
  axios.get(url)
    .then(response => {
      console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch(error => {
      console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}