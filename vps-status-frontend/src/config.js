// Configuration file for the frontend application
// Loads configuration from /config.json at runtime

// Default configuration values (used as fallback if config.json fails to load)
const defaultConfig = {
  apiUrl: '/api/vps-status', // Default to a relative path, assuming proxy or same origin might be used
  refreshInterval: 30000     // Default refresh interval: 30 seconds
};

let configPromise = null;

/**
 * Loads configuration from /config.json.
 * Fetches the file only once and caches the promise.
 * Merges loaded config with defaults, preferring loaded values.
 * Falls back to defaultConfig if fetching or parsing fails.
 * @returns {Promise<object>} A promise that resolves with the final configuration object.
 */
function loadConfig() {
  if (!configPromise) {
    console.log('Attempting to load runtime configuration from /config.json...');
    configPromise = fetch('/config.json')
      .then(response => {
        if (!response.ok) {
          // Don't throw immediately, log and proceed to catch for fallback
          console.error(`Failed to fetch /config.json: HTTP status ${response.status}`);
          return Promise.reject(new Error(`HTTP error! status: ${response.status}`)); // Reject to trigger catch
        }
        return response.json(); // Attempt to parse JSON
      })
      .then(runtimeConfig => {
        console.log('Runtime configuration loaded successfully:', runtimeConfig);
        // Merge runtime config with defaults, runtime values take precedence
        const finalConfig = { ...defaultConfig, ...runtimeConfig };
        console.log('Final configuration:', finalConfig);
        return finalConfig;
      })
      .catch(error => {
        // Catches fetch errors (network, HTTP status) or JSON parsing errors
        console.error('Error loading or parsing runtime configuration from /config.json:', error.message);
        console.warn('Using default configuration as fallback.');
        // Fallback to default config
        return defaultConfig;
      });
  }
  return configPromise;
}

// Export the function to load config
export { loadConfig };
