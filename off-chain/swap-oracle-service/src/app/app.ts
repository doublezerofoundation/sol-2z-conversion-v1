import express from 'express';
import appRouter from "./route";
import {configUtil, ConfigUtil} from "../utils/configUtil";



 export default class App {
    public app: express.Application
    public config: ConfigUtil;
    public server: any;

    constructor() {
        this.config = configUtil;
        this.app = express();
    }

    async startServer() {
        this.app.use('/api/v1', appRouter)
        this.app.use('/', (req, res) => {
            res.send('Swap Oracle Service is running');
        });

        this.server = await this.app.listen(this.config.get('applicationPort'));
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