import express, { Request, Response } from 'express';
import { recoverHistory } from './core/history';
import { tailRealTime } from './core/realtime';
import config, { getLogLevel } from './utils/config';
import { logger } from './utils/logger';

// Initialize logger 
logger.setLevel(getLogLevel());

const PORT = config.applicationPort;

async function startServer() {
    try {
        const app = express();
        
        app.use('/', (req: Request, res: Response) => {
            res.send('Indexer Service is running');
        });
        
        // Start the indexer in the background
        logger.info('Starting indexer service...');
        logger.info('Configuration loaded', {
            rpcUrl: config.RPC_URL,
            programId: config.PROGRAM_ID,
            concurrency: config.CONCURRENCY,
            port: PORT
        });
        
        (async () => {
            try {
                tailRealTime();
                await recoverHistory();
                logger.info('Historical data recovery completed');
            } catch (error) {
                logger.error('Historical data recovery failed', { 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        })();

        const server = app.listen(PORT, () => {
            logger.info(`Indexer Service started on port ${PORT}`);
        });
        
        // Graceful shutdown
        const shutdown = () => {
            logger.info('Shutting down gracefully...');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        };
        
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        
    } catch (error) {
        logger.error('Failed to start server', { 
            error: error instanceof Error ? error.message : String(error) 
        });
        process.exit(1);
    }
}

startServer();