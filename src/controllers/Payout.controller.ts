
import { PayoutService } from '@services/payout.service';
import { Request, Response, NextFunction } from 'express';
import Container from 'typedi';

import crypto from 'crypto'
import { PayoutModel } from '@/models/Payout.model';
import { RAZORPAYX_WEBHOOK_SECRET } from '@config'
import { OrderModel } from '@/models/Order.model';



export class PayoutController {
    private payoutService = Container.get(PayoutService);

    public createPayout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = req.params;
            const { amount } = req.body;

            // const payout = await this.payoutService.payoutCus(storeId, amount);

            // res.status(201).json({
            //     status: true,
            //     message: 'Payout initiated successfully',
            //     data: payout
            // });
        } catch (error) {
            next(error);
        }
    }

    public getPayoutStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { payoutId } = req.params;
            // const status = await this.payoutService.getPayoutStatus(payoutId);

            // res.status(200).json({
            //     status: true,
            //     data: status
            // });
        } catch (error) {
            next(error);
        }







    }


    public verifyRazorpayXWebhook(body: any, signature: string): boolean {
        const webhookSecret = RAZORPAYX_WEBHOOK_SECRET!;
        const bodyString = JSON.stringify(body);
        console.log("bodyString", bodyString)
        const generatedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(bodyString)
            .digest('hex');

        console.log("generatedSignature", generatedSignature)
        console.log("signature", signature)


        return generatedSignature === signature;
    }
    public razorpayXwebhook = async (req: Request, res: Response) => {
        console.log("=======razorpayXwebhook start======")
        try {
            // Verify webhook signature (critical for security)
            const signature = req.headers['x-razorpay-signature'] as string;
            const isValid = this.verifyRazorpayXWebhook(req.body, signature);
            console.log("req.headers", req.headers)
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid signature' });
            }

            // Handle payout event
            const event = req.body.event;
            const payoutData = req.body.payload.payout.entity;
            console.log("event", event)
            console.log("payoutData", payoutData)


            switch (event) {
                case 'payout.processed':
                    await this.handlePayoutSuccess(payoutData);
                    break;
                case 'payout.failed':
                    await this.handlePayoutFailure(payoutData);
                    break;
                default:
                    console.log('Unhandled event:', event);
            }

            res.status(200).send('OK');
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    public async handlePayoutSuccess(payoutData: any) {
        // Update payout status to 'success'
        await PayoutModel.findOneAndUpdate(
            { payoutId: payoutData.id },
            {
                status: 'success',
                razorpayPayoutId: payoutData.id,
                processedAt: new Date(),
            }
        );
        console.log("handlePayoutSuccess status change => success")

        // Optional: Notify seller via email/notification
    }


    public async handlePayoutFailure(payoutData: any) {
        // Update payout status to 'failed' and log error
        await PayoutModel.findOneAndUpdate(
            { payoutId: payoutData.id },
            {
                status: 'failed',
                error: payoutData.error.description,
                failedAt: new Date(),
            }
        );

        console.log("handlePayoutFailure status change => falid")
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