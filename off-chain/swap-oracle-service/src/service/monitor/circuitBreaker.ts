import {CircuitBreakerConfig, CircuitBreakerState, CircuitBreakerStats} from "../../types/common";

export class CircuitBreaker {
    private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
    private openedAt?: number;
    private consecutiveHealthCheckPasses?: number;
    private lastFailureReason?: string;

    constructor(private config:CircuitBreakerConfig) {}

    onHealthCheckFailure(): void {
        this.openCircuit('Health check failed');
    }

    onPriceRetrievalFailure(): void {
        this.openCircuit('Price retrieval failed');
    }

    onHealthCheckSuccess(): void {
        if(this.state === CircuitBreakerState.OPEN) {
            this.consecutiveHealthCheckPasses++;
            console.log(`ConsecutiveHealthCheckPasses: ${this.consecutiveHealthCheckPasses}`);

            if(this.consecutiveHealthCheckPasses >= this.config.healthCheckAttemptsToClose) {
                this.closeCircuit();
            }
        } else {
            this.consecutiveHealthCheckPasses = 0;
        }
    }

    canExecute(): boolean {
        if (this.state === CircuitBreakerState.CLOSED) {
            return true;
        }
        return false;
    }

    private openCircuit(reason: string): void {
        if (this.state === CircuitBreakerState.CLOSED) {
            console.log(`Opening circuit breaker: ${reason}`);
            this.state = CircuitBreakerState.OPEN;
            this.openedAt = Date.now();
            this.consecutiveHealthCheckPasses = 0;
            this.lastFailureReason = reason;
        }
    }

    private closeCircuit(): void {
        console.log('Closing circuit breaker after successful health checks');
        this.state = CircuitBreakerState.CLOSED;
        this.openedAt = undefined;
        this.consecutiveHealthCheckPasses = 0;
    }

    getStats(): CircuitBreakerStats {
        return {
            state: this.state,
            openedAt: this.openedAt,
            lastFailureReason: this.lastFailureReason
        };
    }


}