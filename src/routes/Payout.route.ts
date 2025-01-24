// src/routes/payout.route.ts
import { Router } from 'express';
import { PayoutController } from '@/controllers/Payout.controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class PayoutRoute {
    public path = '/payouts';
    public router = Router();
    public payoutController = new PayoutController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(
            `${this.path}/:storeId`,
            // AuthMiddleware,
            this.payoutController.createPayout
        );

        this.router.get(
            `${this.path}/status/:payoutId`,
            AuthMiddleware,
            this.payoutController.getPayoutStatus
        );
    }
}