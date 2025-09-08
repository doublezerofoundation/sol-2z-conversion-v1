import IMetricsMonitoringService from "./IMetricsMonitoringService";
import {CloudWatchClient, PutMetricDataCommand, PutMetricDataCommandInput} from "@aws-sdk/client-cloudwatch";
import process from "node:process";
const AWS_REGION:string = process.env.AWS_REGION || 'us-east-1';
const ENV:string = process.env.ENVIRONMENT || 'dev';
import {injectable} from "inversify";

@injectable()
export default class CloudWatchMonitoringService implements IMetricsMonitoringService {
    private cloudWatchClient: CloudWatchClient;
    constructor() {
        this.cloudWatchClient = new CloudWatchClient({region: AWS_REGION});
    }


    async putMonitoringData(serviceName:string, value:number): Promise<void> {
        const params:PutMetricDataCommandInput = {
            MetricData: [
                {
                    MetricName:`${serviceName}-${ENV}`,
                    Value: value,
                    Unit: "Count"
                }
            ],
            Namespace: `${ENV}-SwapOracleService`,

        }
        const command = new PutMetricDataCommand(params);
        await this.cloudWatchClient.send(command);


    }
    getMonitoringData(): void {
        throw new Error("Method not implemented.");
    }




}