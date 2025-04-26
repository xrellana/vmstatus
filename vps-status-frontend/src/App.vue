<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import VpsCard from './components/VpsCard.vue';
import config from './config.js';

// Removed static sampleData definition

const servers = ref([]);
const isLoading = ref(true);
const error = ref(null);
const apiUrl = config.apiUrl; // Use the API URL from config
let intervalId = null;
const refreshInterval = config.refreshInterval; // Use the refresh interval from config

const fetchStatus = async () => {
  // Don't set isLoading to true on subsequent fetches, only the initial one
  // isLoading.value = true;
  error.value = null;
  console.log('Fetching VPS status...'); // Log fetching attempt

  try {
    const response = await fetch(apiUrl);
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

onMounted(() => {
  fetchStatus(); // Fetch immediately on mount
  intervalId = setInterval(fetchStatus, refreshInterval); // Fetch periodically
});

onUnmounted(() => {
  clearInterval(intervalId); // Clear interval when component is unmounted
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6">
    <h1 class="text-2xl sm:text-3xl font-bold mb-6 text-center">VPS Status Dashboard</h1>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center text-gray-500 dark:text-gray-400">
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

  </div>
</template>

<style scoped>
/* Remove previous styles, rely on Tailwind */
/* Add any App-specific overrides here if needed */
</style>
