import express, { Request, Response } from 'express';
import { recoverHistory } from './core/history';
import { tailRealTime } from './core/realtime';
import { configUtil } from './utils/configUtil';
import { logger } from './utils/logger';

// Initialize logger with config
logger.setLevel(configUtil.getLogLevel());

const PORT = configUtil.getApplicationPort() || process.env.PORT;

async function startServer() {
    try {
        const app = express();
        
        app.use('/', (req: Request, res: Response) => {
            res.send('Indexer Service is running');
        });
        
        // Start the indexer in the background
        logger.info('Starting indexer service...');
        logger.info('Configuration loaded', {
            rpcUrl: configUtil.getRpcUrl(),
            programId: configUtil.getProgramId(),
            concurrency: configUtil.getConcurrency(),
            port: PORT
        });
        
        (async () => {
            try {
                tailRealTime();
            } catch (error) {
                logger.error('Failed to start real-time indexing', { 
                    error: error instanceof Error ? error.message : String(error),
                    component: 'realtime'
                });
            }

            try {
                await recoverHistory();
            } catch (error) {
                logger.error('Historical data recovery failed', { 
                    error: error instanceof Error ? error.message : String(error),
                    component: 'history',
                    impact: 'Real-time indexing continues normally'
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