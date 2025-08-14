import {Container} from "inversify";
import 'reflect-metadata'

import ISwapRateService from '../service/swap/ISwapRateService';
import { PythSwapRateService } from '../service/swap/PythSwapRateService';
import {AttestationService, IAttestationService} from '../service/attestaion/attestationService';
import { CacheService } from '../service/cache/cacheService';
import { RedisCacheService } from '../service/cache/redisCacheService';
import IMetricsMonitoringService from '../service/monitor/IMetricsMonitoringService';
import CloudWatchMonitoringService from '../service/monitor/cloudWatchMonitoringService';
import { HealthMonitoringService } from '../service/monitor/healthMonitoringService';
import SwapRateController from '../controllers/swapRateController';
import {IKeyManager, KeyManager} from '../service/attestaion/keyManager';
import { PricingServiceFactory } from './serviceFactory';
import { configUtil } from '../utils/configUtil';
import { TYPES } from '../types/common';
import {CircuitBreakerService} from "../service/monitor/circuitBreakerService";


const container = new Container();

container.bind(TYPES.ConfigUtil).toConstantValue(configUtil);
container.bind<CacheService>(TYPES.CacheService).to(RedisCacheService).inSingletonScope();
container.bind<IKeyManager>(TYPES.KeyManager).to(KeyManager).inSingletonScope();
container.bind<IAttestationService>(TYPES.AttestationService).to(AttestationService).inSingletonScope();
container.bind<IMetricsMonitoringService>(TYPES.MetricsMonitoringService).to(CloudWatchMonitoringService).inSingletonScope();
container.bind<HealthMonitoringService>(TYPES.HealthMonitoringService).to(HealthMonitoringService).inSingletonScope();

container.bind<PricingServiceFactory>(TYPES.PricingServiceFactory).to(PricingServiceFactory).inSingletonScope();
container.bind<ISwapRateService>(TYPES.SwapRateService).to(PythSwapRateService).inSingletonScope();
container.bind<SwapRateController>(TYPES.SwapRateController).to(SwapRateController).inSingletonScope();
container.bind<CircuitBreakerService>(TYPES.CircuitBreakerService).to(CircuitBreakerService).inSingletonScope();
export default container;


