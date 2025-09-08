export default interface IMetricsMonitoringService {

    putMonitoringData(serviceName:string, value:number):void
    getMonitoringData(serviceName:string):void
}