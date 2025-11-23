import axios from "axios";

// ============ CONSTS ============

const url = `https://ts-database.onrender.com`;

const interval_ms = 30000;

// ============ INIT ============

/// @brief Ping server every interval_ms
function reloadWebsite() {
  axios.get(url)
    .then(response => {
      console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch(error => {
      console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}

setInterval(reloadWebsite, interval_ms);