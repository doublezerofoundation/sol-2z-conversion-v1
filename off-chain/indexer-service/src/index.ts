import express, { Request, Response } from 'express';
import { recoverHistory } from './core/history';
import { tailRealTime } from './core/realtime';
import config from './utils/config';

const PORT = config.applicationPort;

async function startServer() {
    try {
        const app = express();
        
        app.use('/', (req: Request, res: Response) => {
            res.send('Indexer Service is running');
        });
        
        // Start the indexer in the background
        console.log('🚀 Starting indexer service...');
        console.log(`RPC URL: ${config.RPC_URL}`);
        console.log(`Program ID: ${config.PROGRAM_ID}`);
        
        (async () => {
            try {
                tailRealTime();
                await recoverHistory();
                console.log('✅ Historical data recovery completed');
            } catch (error) {
                console.error('❌ Historical data recovery failed:', error);
            }
        })();

        const server = app.listen(PORT, () => {
            console.log(`Indexer Service started on port ${PORT}`);
        });
        
        // Graceful shutdown
        const shutdown = () => {
            console.log('Shutting down gracefully...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        };
        
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();