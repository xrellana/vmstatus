const si = require('systeminformation');
const express = require('express');

const app = express();
const port = 9101; // Port for the agent to listen on

async function getMetrics() {
    try {
        // Fetch all data concurrently
        const [
            cpuData,
            memData,
            fsSizeData,
            networkStatsData,
            timeData,
            currentLoadData
        ] = await Promise.all([
            si.cpu(), // Gets CPU info including cores
            si.mem(), // Gets memory and swap info
            si.fsSize(), // Gets filesystem size/usage (array)
            si.networkStats(), // Gets network stats per interface (array)
            si.time(), // Gets system time and uptime
            si.currentLoad() // Gets CPU load including avgload
        ]);

        // --- Process CPU ---
        const cpu = {
            count: cpuData.cores,
            // Note: si.currentLoad().currentLoad is often more reliable than si.cpu().speed
            usagePercent: parseFloat((currentLoadData.currentLoad ?? 0).toFixed(2)), // Overall load % - Default to 0 if null/undefined
            // Ensure avgLoad is an array before mapping
            loadAverage: Array.isArray(currentLoadData.avgLoad)
                ? currentLoadData.avgLoad.map(load => parseFloat((load ?? 0).toFixed(2))) // Default inner values to 0
                : [0, 0, 0] // Default if not an array
        };

        // --- Process Memory ---
        // Ensure memData values are numbers before calculation
        const totalMem = memData.total ?? 0;
        const activeMem = memData.active ?? 0;
        const memory = {
            totalBytes: totalMem,
            usedBytes: activeMem, // 'active' is often a better measure of used RAM than 'used'
            usagePercent: totalMem > 0 ? parseFloat(((activeMem / totalMem) * 100).toFixed(2)) : 0
        };

        // --- Process Swap ---
        // Ensure swap values are numbers before calculation
        const totalSwap = memData.swaptotal ?? 0;
        const usedSwap = memData.swapused ?? 0;
        const swap = {
            totalBytes: totalSwap,
            usedBytes: usedSwap,
            usagePercent: totalSwap > 0 ? parseFloat(((usedSwap / totalSwap) * 100).toFixed(2)) : 0
        };

        // --- Process Disk (find root '/') ---
        const rootDisk = fsSizeData.find(fs => fs.mount === '/');
        const disk = rootDisk ? {
            path: rootDisk.mount,
            totalBytes: rootDisk.size,
            usedBytes: rootDisk.used,
            usagePercent: parseFloat((rootDisk.use ?? 0).toFixed(2)) // Default to 0 if null/undefined
        } : { // Fallback if '/' not found
            path: 'N/A',
            totalBytes: 0,
            usedBytes: 0,
            usagePercent: 0
        };

        // --- Process Network (find default interface) ---
        const defaultInterface = await si.networkInterfaceDefault();
        const netStats = networkStatsData.find(iface => iface.iface === defaultInterface);
        const network = netStats ? {
            interface: netStats.iface,
            // Calculate speed (rx_sec/tx_sec are bytes per second) - Default to 0 if null/undefined
            rxSpeedBps: parseFloat((netStats.rx_sec ?? 0).toFixed(0)),
            txSpeedBps: parseFloat((netStats.tx_sec ?? 0).toFixed(0))
        } : { // Fallback if default interface stats not found
            interface: defaultInterface || 'N/A',
            rxSpeedBps: 0,
            txSpeedBps: 0
        };

        // --- Process System ---
        const system = {
            uptimeSeconds: timeData.uptime
        };

        return {
            cpu,
            memory,
            swap,
            disk,
            network,
            system,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error fetching system metrics:', error);
        // Return a structured error object or throw? For now, return error state.
        return { error: 'Failed to fetch metrics', details: error.message };
    }
}

// API Endpoint
app.get('/metrics', async (req, res) => {
    const metrics = await getMetrics();
    if (metrics.error) {
        res.status(500).json(metrics);
    } else {
        res.json(metrics);
    }
});

// Start Server
app.listen(port, '0.0.0.0', () => { // Listen on all interfaces
    console.log(`VPS Metrics Agent listening on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
