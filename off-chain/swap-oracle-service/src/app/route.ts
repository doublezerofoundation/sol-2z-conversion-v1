import  express from 'express';
import SwapRateController from "../controllers/swapRateController";

const appRouter = express.Router();
const swapRateController = new SwapRateController()

appRouter.get('/swap-rate', swapRateController.swapRateHandler);

appRouter.get('/health', (req, res) => {

    // TODO
    res.send('Hello World');
});

export default appRouter;