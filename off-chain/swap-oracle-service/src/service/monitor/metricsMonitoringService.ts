export default interface MetricsMonitoringService {

    putMonitoringData(serviceName:string, value:number):void
    getMonitoringData(serviceName:string):void
}