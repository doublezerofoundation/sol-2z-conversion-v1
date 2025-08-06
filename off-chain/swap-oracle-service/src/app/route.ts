import  express from 'express';
import SwapRateController from "../controllers/swapRateController";
import container from "../factory/serviceContainer";
import {TYPES} from "../types/common";

const appRouter = express.Router();
const swapRateController = container.get<SwapRateController>(TYPES.SwapRateController);

appRouter.get('/swap-rate', swapRateController.swapRateHandler);
appRouter.get('/health',swapRateController.healthCheckHandler);

export default appRouter;