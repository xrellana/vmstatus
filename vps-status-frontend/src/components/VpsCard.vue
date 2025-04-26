<script setup>
import { computed } from 'vue';

// Define the prop to accept the VPS data object
const props = defineProps({
  vps: {
    type: Object,
    required: true
  }
});

// --- Helper Functions (moved here for simplicity for now) ---

// Format Bytes
const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Format Speed (Bps to Mbps/Kbps)
const formatSpeed = (bps, decimals = 2) => {
    if (!+bps) return '0 Bps';
    const k = 1000; // Use 1000 for network speeds
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    // Handle very low speeds showing as Bps
    if (i === 0) return `${bps} ${sizes[i]}`;
    return `${parseFloat((bps / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};


// Format Uptime (Seconds to Days/Hours/Minutes)
const formatUptime = (seconds) => {
  if (!+seconds) return 'N/A';
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  // const s = Math.floor(seconds % 60); // Usually not needed

  let parts = [];
  if (d > 0) parts.push(d + (d === 1 ? " day" : " days"));
  if (h > 0) parts.push(h + (h === 1 ? " hour" : " hours"));
  if (m > 0) parts.push(m + (m === 1 ? " minute" : " minutes"));
  // if (s > 0) parts.push(s + "s"); // Usually not needed

  if (parts.length === 0) return 'Less than a minute';
  return parts.join(', ');
};

// --- Computed Properties for Display ---

const isMetricsAvailable = computed(() => {
  return props.vps.isOnline && props.vps.metrics && !props.vps.metrics.error && !props.vps.metrics.info;
});

const cpuUsage = computed(() => {
    return isMetricsAvailable.value ? props.vps.metrics.cpu?.usagePercent?.toFixed(1) ?? 'N/A' : 'N/A';
});

const cpuCores = computed(() => {
    return isMetricsAvailable.value ? props.vps.metrics.cpu?.count ?? 'N/A' : 'N/A';
});

const ramUsagePercent = computed(() => {
    return isMetricsAvailable.value ? props.vps.metrics.memory?.usagePercent?.toFixed(1) ?? 'N/A' : 'N/A';
});
const ramUsed = computed(() => {
    return isMetricsAvailable.value ? formatBytes(props.vps.metrics.memory?.usedBytes) : 'N/A';
});
const ramTotal = computed(() => {
    return isMetricsAvailable.value ? formatBytes(props.vps.metrics.memory?.totalBytes) : 'N/A';
});

const swapUsagePercent = computed(() => {
    return isMetricsAvailable.value ? props.vps.metrics.swap?.usagePercent?.toFixed(1) ?? 'N/A' : 'N/A';
});
const swapUsed = computed(() => {
    return isMetricsAvailable.value ? formatBytes(props.vps.metrics.swap?.usedBytes) : 'N/A';
});
const swapTotal = computed(() => {
    return isMetricsAvailable.value ? formatBytes(props.vps.metrics.swap?.totalBytes) : 'N/A';
});


const diskUsagePercent = computed(() => {
    return isMetricsAvailable.value ? props.vps.metrics.disk?.usagePercent?.toFixed(1) ?? 'N/A' : 'N/A';
});
const diskUsed = computed(() => {
    return isMetricsAvailable.value ? formatBytes(props.vps.metrics.disk?.usedBytes) : 'N/A';
});
const diskTotal = computed(() => {
    return isMetricsAvailable.value ? formatBytes(props.vps.metrics.disk?.totalBytes) : 'N/A';
});

const networkRx = computed(() => {
    return isMetricsAvailable.value ? formatSpeed(props.vps.metrics.network?.rxSpeedBps ?? 0) : 'N/A';
});
const networkTx = computed(() => {
    return isMetricsAvailable.value ? formatSpeed(props.vps.metrics.network?.txSpeedBps ?? 0) : 'N/A';
});

const uptime = computed(() => {
    return isMetricsAvailable.value ? formatUptime(props.vps.metrics.system?.uptimeSeconds) : 'N/A';
});

const lastCheckTime = computed(() => {
    try {
        return props.vps.lastCheck ? new Date(props.vps.lastCheck).toLocaleString() : 'N/A';
    } catch (e) {
        return 'Invalid Date';
    }
});

const locationDisplay = computed(() => {
    const loc = props.vps.location;
    if (!loc) return '❓ Unknown';
    const flag = loc.flag || '❓';
    const country = loc.country && loc.country !== 'N/A' ? loc.country : '';
    // const city = loc.city && loc.city !== 'N/A' ? `, ${loc.city}` : ''; // Optional city
    return `${flag} ${country}`;
});

const statusClass = computed(() => {
  return props.vps.isOnline ? 'bg-green-500' : 'bg-red-500';
});

const getProgressBarClass = (percent) => {
    const p = parseFloat(percent);
    if (isNaN(p)) return 'bg-gray-400';
    if (p > 90) return 'bg-red-600';
    if (p > 75) return 'bg-yellow-500';
    return 'bg-blue-600';
};

</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 flex flex-col justify-between min-h-[250px]">
    <!-- Header -->
    <div class="flex justify-between items-start mb-3">
      <div class="flex-1 mr-2">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate" :title="vps.name">{{ vps.name }}</h3>
        {/* IP address display removed */}
      </div>
      <div class="flex items-center space-x-2">
         <span class="text-lg" :title="vps.location?.country + (vps.location?.city !== 'N/A' ? ', ' + vps.location?.city : '')">{{ locationDisplay }}</span>
        <span class="w-3 h-3 rounded-full" :class="statusClass" :title="vps.isOnline ? 'Online' : 'Offline'"></span>
      </div>
    </div>

    <!-- Metrics -->
    <div v-if="isMetricsAvailable" class="space-y-2 text-sm text-gray-700 dark:text-gray-300 flex-grow">
      <!-- CPU -->
      <div>
        <span class="font-medium">CPU ({{ cpuCores }} {{ cpuCores === 1 ? 'Core' : 'Cores' }}):</span> {{ cpuUsage }}%
        <div class="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mt-1">
          <div class="h-1.5 rounded-full" :class="getProgressBarClass(cpuUsage)" :style="{ width: cpuUsage + '%' }"></div>
        </div>
      </div>
      <!-- RAM -->
      <div>
        <span class="font-medium">RAM:</span> {{ ramUsagePercent }}% ({{ ramUsed }} / {{ ramTotal }})
        <div class="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mt-1">
          <div class="h-1.5 rounded-full" :class="getProgressBarClass(ramUsagePercent)" :style="{ width: ramUsagePercent + '%' }"></div>
        </div>
      </div>
       <!-- Swap -->
       <div v-if="swapTotal !== '0 Bytes' && swapUsagePercent !== 'N/A'">
         <span class="font-medium">Swap:</span> {{ swapUsagePercent }}% ({{ swapUsed }} / {{ swapTotal }})
         <div class="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mt-1">
           <div class="h-1.5 rounded-full" :class="getProgressBarClass(swapUsagePercent)" :style="{ width: swapUsagePercent + '%' }"></div>
         </div>
       </div>
      <!-- Disk -->
      <div>
        <span class="font-medium">Disk:</span> {{ diskUsagePercent }}% ({{ diskUsed }} / {{ diskTotal }})
        <div class="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mt-1">
          <div class="h-1.5 rounded-full" :class="getProgressBarClass(diskUsagePercent)" :style="{ width: diskUsagePercent + '%' }"></div>
        </div>
      </div>
      <!-- Network -->
      <div class="flex justify-between">
        <span><span class="font-medium">Net Rx:</span> {{ networkRx }}</span>
        <span><span class="font-medium">Tx:</span> {{ networkTx }}</span>
      </div>
      <!-- Uptime -->
      <div>
        <span class="font-medium">Uptime:</span> {{ uptime }}
      </div>
    </div>

    <!-- Offline/Error Message -->
    <div v-else class="flex-grow flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
      <div v-if="!vps.isOnline">Server is Offline</div>
      <div v-else-if="vps.metrics?.error">Agent Error: {{ vps.metrics.error }}</div>
      <div v-else-if="vps.metrics?.info">{{ vps.metrics.info }}</div>
      <div v-else>Metrics unavailable</div>
    </div>

    <!-- Footer -->
    <div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 text-right">
      Last Check: {{ lastCheckTime }}
    </div>
  </div>
</template>

<style scoped>
/* Add any component-specific styles here if needed, though Tailwind should cover most */
</style>
