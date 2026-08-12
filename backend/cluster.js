const cluster = require('cluster');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const numCPUs = process.env.CLUSTER_WORKERS ? parseInt(process.env.CLUSTER_WORKERS, 10) : os.cpus().length;
const PORT = process.env.PORT || 5000;

if (cluster.isPrimary || cluster.isMaster) {
    console.log(`=======================================================`);
    console.log(`  UC-Centralized Campus Load Balancer (Master Node)`);
    console.log(`  Deployment: UC Main Campus`);
    console.log(`  Master PID: ${process.pid}`);
    console.log(`  Allocating ${numCPUs} worker processes across CPU cores...`);
    console.log(`=======================================================`);

    // Fork workers across all CPU cores
    for (let i = 0; i < numCPUs; i++) {
        const worker = cluster.fork({ WORKER_ID: `Worker-${i + 1}` });
        console.log(`[MASTER] Forked Worker ${i + 1} (PID: ${worker.process.pid})`);
    }

    // Auto-restart workers if one dies
    cluster.on('exit', (worker, code, signal) => {
        console.warn(`[WARNING] Worker PID ${worker.process.pid} died (Signal: ${signal || code}). Spawning replacement...`);
        const newWorker = cluster.fork();
        console.log(`[MASTER] Replacement Worker started (PID: ${newWorker.process.pid})`);
    });

    // Graceful shutdown handling
    const handleShutdown = (signal) => {
        console.log(`\n[MASTER] Received ${signal}. Gracefully shutting down all workers...`);
        for (const id in cluster.workers) {
            cluster.workers[id].process.kill(signal);
        }
        process.exit(0);
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

} else {
    // Worker processes run the backend server instance
    const { server } = require('./server');
    const workerTag = process.env.WORKER_ID || `Worker-PID-${process.pid}`;

    server.listen(PORT, () => {
        console.log(`[LOAD-BALANCER WORKER] ${workerTag} active on port ${PORT} (PID: ${process.pid})`);
    });
}
