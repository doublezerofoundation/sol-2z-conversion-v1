import express from 'express';
import appRouter from "./route";
import {configUtil, ConfigUtil} from "../utils/configUtil";
import {HealthMonitoringService} from "../service/monitor/healthMonitoringService";



 export default class App {
    public app: express.Application
    public config: ConfigUtil;
    public server: any;
    private healthMonitoringService: HealthMonitoringService;

    constructor() {
        this.config = configUtil;
        this.app = express();
    }

    async startServer() {
        this.app.use('/api/v1', appRouter)
        this.app.use('/', (req, res) => {
            res.send('Swap Oracle Service is running');
        });
        this.startMonitoringService();
        this.server = await this.app.listen(this.config.get('applicationPort'));
    }

    startMonitoringService() {
        setInterval(async () => {
            console.log("Health monitoring started",Date.now())
            await HealthMonitoringService.getInstance().startMonitoring();
            console.log("Health monitoring completed",Date.now(),
                HealthMonitoringService.getInstance().getHealthMonitoringData())
        }, 60000)
    }

    public getApp(): express.Application {
        return this.app;
    }

    public getConfig(): any {
        return this.config;
    }

    public stopServer(): void {
        this.server.close(() => {
            console.log('Server has been stopped');
        });
    }


}