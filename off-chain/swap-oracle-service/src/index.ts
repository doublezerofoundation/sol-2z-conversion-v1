import 'reflect-metadata';
import App from './app/app';
import container from "./factory/serviceContainer";
import {TYPES} from "./types/common";
import {ConfigUtil} from "./utils/configUtil";
import {HealthMonitoringService} from "./service/monitor/healthMonitoringService";
import { logger } from './utils/logger';

const config = container.get<ConfigUtil>(TYPES.ConfigUtil);
logger.setLevel(config.getLogLevel());
const healthMonitoringService = container.get<HealthMonitoringService>(TYPES.HealthMonitoringService);

const app = new App(config,healthMonitoringService)
app.startServer()
    .then(() => {
        logger.info('Server started successfully');
    })
    .catch((error) => {
        logger.error('Failed to start server:', error);
        process.exit(1);
});
