<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'; // Import computed
import VpsCard from './components/VpsCard.vue';
import { loadConfig } from './config.js'; // Import the loadConfig function

// Removed static sampleData definition

const servers = ref([]);
const isLoading = ref(true); // Start as true until config and first fetch are done
const error = ref(null);
let apiUrl = ref(''); // Will be set after config loads
let refreshInterval = ref(30000); // Default, will be updated from config
let intervalId = null;
let configLoaded = ref(false); // Track if config has loaded

const fetchStatus = async () => {
  if (!configLoaded.value) {
    console.warn("Configuration not loaded yet, skipping fetch.");
    return; // Don't fetch if config isn't ready
  }
  // Don't set isLoading to true on subsequent fetches, only the initial one
  // isLoading.value = true; // isLoading is handled differently now
  error.value = null; // Clear previous errors before fetching
  console.log(`Fetching VPS status from ${apiUrl.value}...`); // Log fetching attempt with actual URL

  try {
    // Ensure apiUrl has a value before fetching
    if (!apiUrl.value) {
      throw new Error("API URL is not configured.");
    }
    const response = await fetch(apiUrl.value); // Use the reactive apiUrl
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    servers.value = data;
    console.log('VPS status updated:', data.length, 'servers'); // Log success
  } catch (fetchError) {
    console.error('Error fetching live VPS status:', fetchError); // Log primary error
    // Attempt to fetch local sample data as fallback
    try {
      console.log('Fetching local sample data...');
      const sampleResponse = await fetch('/sample_output'); // Fetch from root (served by Vite)
      if (!sampleResponse.ok) {
        throw new Error(`HTTP error! status: ${sampleResponse.status}`);
      }
      const sampleJsonData = await sampleResponse.json();
      servers.value = sampleJsonData;
      error.value = `Failed to fetch live data (${fetchError.message}). Displaying sample data.`;
      console.log('Loaded sample data successfully.');
    } catch (sampleError) {
      console.error('Error fetching local sample data:', sampleError); // Log secondary error
      error.value = `Failed to fetch live data (${fetchError.message}) AND failed to load sample data (${sampleError.message}).`;
      servers.value = []; // Clear servers if both fetches fail
    }
  } finally {
    isLoading.value = false; // Set loading to false after the first fetch completes
  }
};

onMounted(async () => {
  isLoading.value = true; // Ensure loading is true initially
  error.value = null; // Clear any previous errors
  try {
    const loadedConfig = await loadConfig(); // Load config first
    apiUrl.value = loadedConfig.apiUrl;
    refreshInterval.value = loadedConfig.refreshInterval;
    configLoaded.value = true; // Mark config as loaded
    console.log(`Configuration loaded: API URL = ${apiUrl.value}, Refresh Interval = ${refreshInterval.value}`);

    await fetchStatus(); // Perform the initial fetch *after* config is loaded

    // Set up the interval only after the first fetch is done and config is loaded
    if (intervalId) clearInterval(intervalId); // Clear any potential previous interval
    intervalId = setInterval(fetchStatus, refreshInterval.value); // Use the loaded interval

  } catch (configError) {
    // This catch is primarily for unexpected errors during loadConfig itself,
    // though loadConfig internally handles fetch/parse errors and returns defaults.
    console.error("Critical error during initial configuration loading:", configError);
    error.value = `Failed to load application configuration: ${configError.message}. Using defaults.`;
    // Attempt to proceed with defaults if loadConfig failed catastrophically
    // (This might be redundant if loadConfig's internal catch always returns defaults)
    const defaultConfig = await loadConfig(); // Re-attempt or get cached default promise
    apiUrl.value = defaultConfig.apiUrl;
    refreshInterval.value = defaultConfig.refreshInterval;
    configLoaded.value = true; // Mark config as loaded even with defaults
    await fetchStatus(); // Try fetching with defaults
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(fetchStatus, refreshInterval.value);
  } finally {
     // isLoading is set to false inside fetchStatus's finally block
     // We might need to reconsider if config load fails before first fetch
     if (!servers.value.length && !error.value) {
        // If config loaded but fetchStatus hasn't run or failed silently
        // isLoading.value = false; // Ensure loading finishes if fetchStatus had issues
     }
  }
});

onUnmounted(() => {
  clearInterval(intervalId); // Clear interval when component is unmounted
});

// Computed properties for server counts
const totalServers = computed(() => servers.value.length);
const onlineServers = computed(() => servers.value.filter(s => s.isOnline).length);
const offlineServers = computed(() => totalServers.value - onlineServers.value);

</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Main Content Area (grows to push footer down) -->
    <div class="flex-grow p-4 sm:p-6">
      <!-- Header Row: Title and Status Cards -->
      <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 class="text-2xl sm:text-3xl font-bold">阿坤精神状态</h1>
        <!-- Status Cards Container -->
        <div class="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-4">
          <!-- Total Card -->
          <div class="bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-lg px-3 py-1.5 text-center min-w-[80px]">
            <div class="text-xs text-blue-600 dark:text-blue-300 font-medium">Total</div>
            <div class="text-lg font-bold text-blue-800 dark:text-blue-100">{{ totalServers }}</div>
          </div>
          <!-- Online Card -->
          <div class="bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg px-3 py-1.5 text-center min-w-[80px]">
            <div class="text-xs text-green-600 dark:text-green-300 font-medium">Online</div>
            <div class="text-lg font-bold text-green-800 dark:text-green-100">{{ onlineServers }}</div>
          </div>
          <!-- Offline Card -->
          <div class="bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg px-3 py-1.5 text-center min-w-[80px]">
            <div class="text-xs text-red-600 dark:text-red-300 font-medium">Offline</div>
            <div class="text-lg font-bold text-red-800 dark:text-red-100">{{ offlineServers }}</div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
    <div v-if="isLoading" class="text-center text-gray-500 dark:text-gray-400 mt-4">
      Loading server status...
    </div>

    <!-- Error State (Now indicates fallback) -->
    <div v-if="error" class="text-center text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 p-3 rounded-md mb-4">
      <p><strong>Notice:</strong> {{ error }}</p>
      <!-- Removed retry message as we are showing sample data -->
    </div>

    <!-- Data Display (Show if not loading and we have servers, regardless of error) -->
    <div v-if="!isLoading && servers.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <VpsCard v-for="server in servers" :key="server.ip || server.name" :vps="server" />
    </div>

    <!-- No Data State (Show if not loading and no servers) -->
    <div v-else-if="!isLoading && servers.length === 0" class="text-center text-gray-500 dark:text-gray-400">
      No server data found. Check backend configuration or API response.
    </div>
    </div> <!-- End Main Content Area -->

    <!-- Footer (stays at the bottom) -->
    <footer class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
      © 2025 meowoo.net | <a href="https://blog.meowoo.net" target="_blank" rel="noopener noreferrer" class="hover:underline">My Blog</a>
    </footer>
  </div>
</template>

<style scoped>
/* Remove previous styles, rely on Tailwind */
/* Add any App-specific overrides here if needed */
</style>
