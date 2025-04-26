// Configuration file for the frontend application
// This allows for different configurations in development and production environments

// Get API URL from environment variables (set by Vite)
// VITE_API_URL is defined in the .env file
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/vps-status';

// Default configuration
const config = {
  // API URL from environment variables
  apiUrl,
  // Refresh interval in milliseconds
  refreshInterval: 30000
};

// For backwards compatibility, still check if there's a global configuration object
// that overrides the defaults (though we prefer using environment variables now)
if (window.VPS_CONFIG) {
  Object.assign(config, window.VPS_CONFIG);
}

export default config;
