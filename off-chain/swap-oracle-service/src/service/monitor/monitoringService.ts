export default interface MonitoringService {

    putMonitoringData(serviceName:string, value:number):void
    getMonitoringData(serviceName:string):void
}