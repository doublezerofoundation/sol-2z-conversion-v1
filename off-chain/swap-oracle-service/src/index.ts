import 'reflect-metadata';
import App from './app/app';
import container from "./factory/serviceContainer";
import {TYPES} from "./types/common";
import {ConfigUtil} from "./utils/configUtil";
import {HealthMonitoringService} from "./service/monitor/healthMonitoringService";

const config = container.get<ConfigUtil>(TYPES.ConfigUtil);
const healthMonitoringService = container.get<HealthMonitoringService>(TYPES.HealthMonitoringService);

const app = new App(config,healthMonitoringService)
app.startServer()
    .then(() => {
        console.log('Server started successfully');
    })
    .catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
});
