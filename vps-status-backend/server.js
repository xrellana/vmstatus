const express = require('express');
const cors = require('cors'); // Import cors
const ping = require('ping');
const maxmind = require('maxmind');
const fetch = require('node-fetch'); // Import node-fetch
const fs = require('fs'); // Import fs to read config file

const app = express();
app.use(cors()); // Enable CORS for all origins
const port = 3000; // Or any port you prefer

// --- Configuration ---
let servers = []; // Initialize servers array
const configPath = './config.json';

try {
  const configFileContent = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configFileContent);
  if (config && Array.isArray(config.servers)) {
    servers = config.servers;
    console.log(`Loaded ${servers.length} servers from ${configPath}`);
  } else {
    console.error(`Error: 'servers' array not found or invalid in ${configPath}`);
    // Optionally exit or use a default empty list
  }
} catch (error) {
  console.error(`Error reading or parsing config file ${configPath}:`, error.message);
  // Optionally exit or use a default empty list
}

// Agent fetch settings
const AGENT_TIMEOUT_MS = 5000; // 5 seconds timeout for agent requests

// --- GeoIP Setup ---
let geoIpLookup = null; // Initialize as null
const geoDbPath = './GeoLite2-City.mmdb'; // Assuming it's in the same directory

async function initializeGeoIP() {
  try {
    const lookup = await maxmind.open(geoDbPath);
    geoIpLookup = (ip) => {
        try {
            return lookup.get(ip);
        } catch (lookupError) {
            // Handle potential errors during lookup for specific IPs (e.g., private IPs)
            // console.error(`GeoIP lookup failed for IP ${ip}:`, lookupError.message);
            return null; // Return null if lookup fails for a specific IP
        }
    };
    console.log(`GeoIP database loaded successfully from ${geoDbPath}`);
  } catch (error) {
    console.error(`Error loading GeoIP database from ${geoDbPath}:`, error.message);
    console.log('GeoIP lookups will be disabled. Ensure GeoLite2-City.mmdb exists.');
    // Keep geoIpLookup as null if loading fails
  }
}


// --- Status Cache ---
let cachedStatus = [];
let isUpdating = false;

// --- Core Logic ---
async function updateVpsStatus() {
  if (isUpdating) {
    console.log('Update already in progress, skipping.');
    return;
  }
  isUpdating = true;
  console.log('Starting VPS status update...');

  const statusPromises = servers.map(async (server) => {
    let isOnline = false;
    let location = null;
    let metrics = null; // Initialize metrics as null

    // 1. Check Online Status (Ping)
    try {
      const res = await ping.promise.probe(server.ip, {
        timeout: 2, // Timeout in seconds
        min_reply: 1, // Wait for at least 1 reply
      });
      isOnline = res.alive;
    } catch (error) {
      console.error(`Ping error for ${server.name} (${server.ip}):`, error.message);
      isOnline = false;
    }

    // 2. Get Metrics from Agent (if online and agent URL is configured)
    if (isOnline && server.agentUrl) {
      try {
        const agentRes = await fetch(server.agentUrl, { timeout: AGENT_TIMEOUT_MS });
        if (agentRes.ok) { // Check if status code is 2xx
          metrics = await agentRes.json();
        } else {
          console.error(`Agent request failed for ${server.name} (${server.ip}): Status ${agentRes.status}`);
          metrics = { error: `Agent request failed: Status ${agentRes.status}` };
        }
      } catch (fetchError) {
        console.error(`Agent fetch error for ${server.name} (${server.ip}):`, fetchError.message);
        metrics = { error: `Agent fetch error: ${fetchError.message}` };
      }
    } else if (isOnline && !server.agentUrl) {
        metrics = { info: "Agent not configured for this server." };
    } else {
        // Server is offline, metrics remain null
    }


    // 3. Get Location (GeoIP) - Independent of agent status
    if (geoIpLookup) {
        try {
            const geoData = geoIpLookup(server.ip);
            if (geoData) {
                location = {
                    city: geoData.city?.names?.en || 'N/A', // Use N/A if city unknown
                    country: geoData.country?.iso_code || 'N/A',
                    flag: getFlagEmoji(geoData.country?.iso_code) // Add flag emoji
                };
            } else {
                 // Handle case where IP is in DB but has no city/country data (rare)
                 location = { city: 'N/A', country: 'N/A', flag: '❓' };
            }
        } catch (error) {
            // Error during lookup for *this specific IP* was already handled inside geoIpLookup
            // This catch is more for unexpected errors in the surrounding logic
            console.error(`Unexpected error during GeoIP processing for ${server.ip}:`, error);
            location = { city: 'Error', country: 'ERR', flag: '❓' };
        }
    }

    // Fallback if GeoIP failed or is disabled
    if (!location) {
        location = { city: 'Unknown', country: 'N/A' };
    }


    return {
      name: server.name,
      // ip: server.ip, // Removed for security
      isOnline: isOnline,
      location: location,
      metrics: metrics, // Add metrics here
      lastCheck: new Date().toISOString(),
    };
  });

  try {
    cachedStatus = await Promise.all(statusPromises);
    console.log('VPS status update complete. Cached entries:', cachedStatus.length);
  } catch (error) {
    console.error('Error updating VPS statuses:', error);
  } finally {
    isUpdating = false;
  }
}

// --- API Endpoint ---
app.get('/api/vps-status', (req, res) => {
  res.json(cachedStatus);
});

// --- Helper Functions ---
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2 || countryCode === 'N/A') return '❓';
  // Handle special cases or reserved codes if necessary
  if (countryCode === 'EU') return '🇪🇺'; // Example for European Union

  try {
    // Offset between uppercase ASCII and regional indicator symbols
    const OFFSET = 127397;
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => OFFSET + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (error) {
    console.error(`Error generating flag for ${countryCode}:`, error);
    return '❓'; // Fallback for invalid codes
  }
}


// --- Server Initialization ---
app.listen(port, async () => {
  console.log(`VPS Status Backend listening at http://localhost:${port}`);

  // Initialize GeoIP first
  await initializeGeoIP();

  // Initial status update on startup
  await updateVpsStatus();

  // Schedule periodic updates (every 5 minutes = 300,000 ms)
  setInterval(updateVpsStatus, 5 * 60 * 1000); // 5 minutes
});
