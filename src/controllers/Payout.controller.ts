
import { PayoutService } from '@services/payout.service';
import { Request, Response, NextFunction } from 'express';
import Container from 'typedi';

export class PayoutController {
    private payoutService = Container.get(PayoutService);

    public createPayout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = req.params;
            const { amount } = req.body;

            const payout = await this.payoutService.payoutCus(storeId, amount);

            res.status(201).json({
                status: true,
                message: 'Payout initiated successfully',
                data: payout
            });
        } catch (error) {
            next(error);
        }
    }

    public getPayoutStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { payoutId } = req.params;
            const status = await this.payoutService.getPayoutStatus(payoutId);

            res.status(200).json({
                status: true,
                data: status
            });
        } catch (error) {
            next(error);
        }
    }
}









// import { OrderModel } from "@/models/Order.model";
// import { PayoutModel } from "@/models/Payout.model";
// import { NextFunction, Request, Response } from "express";
// import Razorpay from "razorpay";

// export class PayoutController {



//     public async requestPayout(req: Request, res: Response, next: NextFunction) {
//         try {
//             const { amount } = req.body;
//             const storeId = req.user.storeId;


//             const completedOrders = await OrderModel.find({
//                 storeId,
//                 orderStatus: "completed",
//             });

//             const totalEarnings = completedOrders.reduce((sum, order) => sum + order.totalPrice, 0);
//             const commission = totalEarnings * 0.04;
//             const eligibleAmount = totalEarnings - commission;

//             if (amount > eligibleAmount) {
//                 return res.status(400).json({ message: "Requested amount exceeds eligible earnings" });
//             }


//             const payout = await PayoutModel.create({
//                 storeId,
//                 amount,
//                 status: "requested",
//             });

//             res.status(201).json({ message: "Payout requested successfully", payout });
//         } catch (err) {
//             next(err);
//         }
//     }

//     // In Payment.service.ts
//     public async handlePayoutWebhook(req: Request, res: Response) {
//         const body = req.body;
//         const signature = req.headers['x-razorpay-signature'];

//         // Verify signature
//         const isValid = Razorpay.validateWebhookSignature(
//             JSON.stringify(body),
//             signature,
//             process.env.RAZORPAY_WEBHOOK_SECRET,
//         );

//         if (isValid) {
//             const { payout_id, status } = body.payload.payout.entity;

//             // Update payout status
//             await PayoutModel.findOneAndUpdate(
//                 { payoutId: payout_id },
//                 { status: status },
//             );

//             res.status(200).end();
//         } else {
//             res.status(400).json({ error: 'Invalid signature' });
//         }
//     }

// }