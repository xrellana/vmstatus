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
            usagePercent: parseFloat(currentLoadData.currentLoad.toFixed(2)), // Overall load %
            // Ensure avgLoad is an array before mapping
            loadAverage: Array.isArray(currentLoadData.avgLoad)
                ? currentLoadData.avgLoad.map(load => parseFloat(load.toFixed(2)))
                : [0, 0, 0] // Default if not an array
        };

        // --- Process Memory ---
        const memory = {
            totalBytes: memData.total,
            usedBytes: memData.active, // 'active' is often a better measure of used RAM than 'used'
            usagePercent: parseFloat(((memData.active / memData.total) * 100).toFixed(2))
        };

        // --- Process Swap ---
        const swap = {
            totalBytes: memData.swaptotal,
            usedBytes: memData.swapused,
            usagePercent: memData.swaptotal > 0 ? parseFloat(((memData.swapused / memData.swaptotal) * 100).toFixed(2)) : 0
        };

        // --- Process Disk (find root '/') ---
        const rootDisk = fsSizeData.find(fs => fs.mount === '/');
        const disk = rootDisk ? {
            path: rootDisk.mount,
            totalBytes: rootDisk.size,
            usedBytes: rootDisk.used,
            usagePercent: parseFloat(rootDisk.use.toFixed(2))
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
            // Calculate speed (rx_sec/tx_sec are bytes per second)
            rxSpeedBps: parseFloat(netStats.rx_sec.toFixed(0)),
            txSpeedBps: parseFloat(netStats.tx_sec.toFixed(0))
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
