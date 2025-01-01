import { NextFunction, Request, Response } from 'express';
import { PaymentService } from '@services/Paymnet.Service';
import { Container } from 'typedi';
import { Payment } from '@interfaces/Payment.interface';
import crypto from 'crypto'
import { UserSubscriptionModel } from '@/models/UserSubscriptionSchema.model';
import { UserSubscriptionService } from '@/services/UserSubscription.service';
import { OrderModel } from '@/models/Order.model';
import { ProductVariant } from '@/models/ProductVariant.model';


export class PaymentController {
    private paymentService = Container.get(PaymentService);
    private userSubscriptionService = Container.get(UserSubscriptionService)

    public async createRazorpayPayment(req: Request, res: Response): Promise<Response> {
        const { amount, userId, paymentMethod } = req.body;

        try {
            const newPayment = await this.paymentService.createRazorpayOrder(amount, userId, paymentMethod);
            return res.status(201).json(newPayment);
        } catch (error) {
            return res.status(error.status || 500).json({ message: error.message });
        }
    }
    public async razorpayWebhook(req: Request, res: Response, next: NextFunction): Promise<Response> {
        const secret = 'Kartik02@';
        const body = JSON.stringify(req.body);
        const razorpaySignature = req.headers['x-razorpay-signature'] as string;
        const razorpayTimestamp = req.headers['x-razorpay-timestamp'] as string;


        console.log("Received Signature:", razorpaySignature);
        console.log("Razorpay Timestamp:", razorpayTimestamp);

        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        console.log("Generated Signature:", generatedSignature);
        if (generatedSignature !== razorpaySignature) {
            return res.status(400).json({ message: 'Invalid signature' });
        }

        try {
            const event = req.body.event;
            const paymentDetails = req.body.payload.payment.entity;
            const transactionId = paymentDetails.id;

            if (event === 'payment.captured') {
                await this.paymentService.updatePaymentStatus(paymentDetails.id, 'success');
                await this.userSubscriptionService.activateUserSubscription(paymentDetails.id);
                await this.paymentService.updatePaymentStatus(transactionId, 'paid');
                const updatedOrder = await OrderModel.findOneAndUpdate(
                    { transactionId },
                    { paymentStatus: 'paid', orderStatus: 'confirmed' },
                    { new: true }
                );
                await UserSubscriptionModel.findOneAndUpdate(
                    { transactionId: paymentDetails.id },
                    { isActive: true },
                    { new: true }
                );
                if (updatedOrder) {
                    await Promise.all(
                        updatedOrder.products.map(async (product) => {
                            await ProductVariant.findByIdAndUpdate(product.productId, {
                                $inc: { stock: -product.quantity },
                            });
                        })
                    );
                }
            } else if (event === 'payment.failed') {
                await this.paymentService.updatePaymentStatus(paymentDetails.id, 'failed');
                await this.paymentService.updatePaymentStatus(transactionId, 'failed');
                await OrderModel.findOneAndUpdate(
                    { transactionId },
                    { paymentStatus: 'failed', orderStatus: 'canceled' }
                );
            }


            return res.status(200).json({ message: 'Webhook received successfully' });
        } catch (error) {
            next(error);
        }
    }

    public async createPayment(req: Request, res: Response, next: NextFunction): Promise<Response> {
        const paymentData: Payment = req.body;
        try {
            const newPayment = await this.paymentService.createPayment(paymentData);
            return res.status(201).json(newPayment);
        } catch (error) {
            next(error)
        }
    }

    public async updatePaymentStatus(req: Request, res: Response, next: NextFunction): Promise<Response> {
        const { transactionId, status } = req.body;
        try {
            const updatedPayment = await this.paymentService.updatePaymentStatus(transactionId, status);
            return res.status(200).json(updatedPayment);
        } catch (error) {
            next(error)
        }
    }
}
