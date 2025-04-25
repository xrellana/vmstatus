const express = require('express');
const cors = require('cors'); // Import cors
const ping = require('ping');
const maxmind = require('maxmind');
// const fetch = require('node-fetch'); // Keep for potential GeoIP API fallback

const app = express();
app.use(cors()); // Enable CORS for all origins
const port = 3000; // Or any port you prefer

// --- Configuration ---
// Replace with your actual VPS list
const servers = [
  { name: "VPS 1 (Example)", ip: "8.8.8.8" }, // Google DNS (for testing)
  { name: "VPS 2 (Example)", ip: "1.1.1.1" }, // Cloudflare DNS (for testing)
  { name: "Offline Example", ip: "192.0.2.1" }, // Reserved non-routable IP
  // Add your actual servers here: { name: "My Web Server", ip: "YOUR_VPS_IP_1" },
];

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

    // 2. Get Location (GeoIP)
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
      ip: server.ip,
      isOnline: isOnline,
      location: location,
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
