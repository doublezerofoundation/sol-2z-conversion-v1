import { injectable } from 'inversify';
import {CircuitBreaker} from "./circuitBreaker";
import {CircuitBreakerStats} from "../../types/common";

@injectable()
export class CircuitBreakerService {
    private circuitBreaker: CircuitBreaker;

    constructor() {
        this.circuitBreaker = new CircuitBreaker({healthCheckAttemptsToClose:5})
    }

    reportHealthCheckFailure(): void {
        this.circuitBreaker.onHealthCheckFailure();
    }

    reportPriceRetrievalFailure(): void {
        this.circuitBreaker.onPriceRetrievalFailure();
    }

    reportHealthCheckSuccess(): void {
        this.circuitBreaker.onHealthCheckSuccess();
    }

    canExecute(): boolean {
        return this.circuitBreaker.canExecute();
    }

    getStats(): CircuitBreakerStats {
        return this.circuitBreaker.getStats();
    }




}