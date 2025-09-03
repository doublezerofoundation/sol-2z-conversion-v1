import express from 'express';
import appRouter from "./route";
import {configUtil, ConfigUtil} from "../utils/configUtil";
import {HealthMonitoringService} from "../service/monitor/healthMonitoringService";
import { injectable, inject } from 'inversify';
import {TYPES} from "../types/common";
import {logger} from "../utils/logger";


@injectable()
 export default class App {
    public app: express.Application
    public server: any;

    constructor(
        @inject(TYPES.ConfigUtil) private config: ConfigUtil,
        @inject(TYPES.HealthMonitoringService) private healthMonitoringService: HealthMonitoringService
    ) {
        this.app = express();
    }


    async startServer() {
        this.app.use('/api/v1', appRouter)
        this.app.use('/', (req, res) => {
            res.send('Swap Oracle Service is running');
        });
        await this.startMonitoringService();
        this.server = await this.app.listen(this.config.get('applicationPort'));
    }

    private async startMonitoringService() {
        await this.healthMonitoringService.startMonitoring();
        setInterval(async () => {
            logger.info("Health monitoring started", Date.now());
            await this.healthMonitoringService.startMonitoring();
        }, 60000);
    }


    public getApp(): express.Application {
        return this.app;
    }

    public getConfig(): any {
        return this.config;
    }

    public stopServer(): void {
        this.server.close(() => {
            logger.info('Server has been stopped');
        });
    }


}