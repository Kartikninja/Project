import { NextFunction, Request, Response } from 'express';
import { PaymentService } from '@services/Paymnet.Service';
import { Container } from 'typedi';
import { Payment } from '@interfaces/Payment.interface';
import crypto from 'crypto'
import { UserSubscriptionModel } from '@/models/UserSubscriptionSchema.model';
import { UserSubscriptionService } from '@/services/UserSubscription.service';
import { OrderModel } from '@/models/Order.model';
import { ProductVariant } from '@/models/ProductVariant.model';
import { HttpException } from '@/exceptions/httpException';
import Razorpay from 'razorpay';
import { PaymentModel } from '@/models/Payment.model';
import { SubscriptionModel } from '@/models/Subscription.model';
import { Product } from '@/models/Product.model';
import { StoreModel } from '@/models/Store.model';
import { header } from 'express-validator';
import mongoose from 'mongoose';
import { PayoutModel } from '@/models/Payout.model';
import { StoreDocument } from '@/interfaces/Store.interface';
import { RAZORPAY_API_SECRET, WEBHOOK_SECRET, RAZORPAY_API_KEY, RAZORPAYX_API_KEY, RAZORPAYX_API_SECRET, RAZORPAYX_WEBHOOK_SECRET, REDIS_HOST, REDIS_PORT } from '@config'
import { Queue } from 'bullmq';




export const razorpayInstance = new Razorpay({
    key_secret: RAZORPAY_API_SECRET,
    key_id: RAZORPAY_API_KEY
})

export class PaymentController {

    constructor() {
        this.verifyPayment = this.verifyPayment.bind(this)
    }
    private paymentService = Container.get(PaymentService);
    private userSubscriptionService = Container.get(UserSubscriptionService)



    public async createRazorpayPayment(req: Request, res: Response): Promise<Response> {
        const { amount, userId, paymentMethod, modelName } = req.body;

        try {
            const newPayment = await this.paymentService.createRazorpayOrder(amount, userId, paymentMethod, modelName);
            return res.status(201).json(newPayment);
        } catch (error) {
            return res.status(error.status || 500).json({ message: error.message });
        }
    }



    public getAllPaymnet = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const getAll = await this.paymentService.getAllPaymnet()
            res.status(201).json(getAll)
        } catch (err) {
            next(err)
        }
    }

    public async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<Response> {
        const signature = req.headers['x-razorpay-signature'] as string;
        const payload = req.body;

        try {
            let razorpayOrderId: string;
            let razorpayPaymentId: string;
            let generatedSignature: string;

            if (payload?.event) {
                const rawBody = (req as any).rawBody;
                generatedSignature = crypto
                    .createHmac('sha256', process.env.WEBHOOK_SECRET)
                    .update(rawBody)
                    .digest('hex');
            } else {
                const body = payload.razorpayOrderId + "|" + payload.razorpayPaymentId;
                generatedSignature = crypto
                    .createHmac('sha256', process.env.RAZORPAY_API_SECRET)
                    .update(body)
                    .digest('hex');
            }

            if (!signature || generatedSignature !== signature) {
                throw new HttpException(400, 'Invalid/missing signature');
            }

            razorpayOrderId = payload.razorpayOrderId || payload.payload?.payment?.entity?.order_id;
            razorpayPaymentId = payload.razorpayPaymentId || payload.payload?.payment?.entity?.id;

            if (!razorpayOrderId || !razorpayPaymentId) {
                throw new HttpException(400, 'Missing payment identifiers');
            }

            const payment = await razorpayInstance.payments.fetch(razorpayPaymentId);
            const order = await razorpayInstance.orders.fetch(razorpayOrderId)

            console.log('Razorpay Order Paid:', order);
            console.log('Razorpay Payment Status:', payment);


            const existingPayment = await PaymentModel.findOne({ orderId: razorpayOrderId })

            existingPayment.amount = Number(payment.amount) / 100
            existingPayment.email = payment.email
            existingPayment.paymentId = payment.id
            existingPayment.contact = String(payment.contact)
            existingPayment.vpa = payment.vpa || null
            existingPayment.wallet = payment.wallet || null
            existingPayment.amountRefunded = payment.amount_refunded || null
            existingPayment.refundStatus = String(payment.amount_refunded)
            existingPayment.fee = payment.fee
            existingPayment.tax = payment.tax
            existingPayment.errorCode = payment.error_code
            existingPayment.errorDescription = payment.error_description
            existingPayment.acquirerData = {
                rrn: payment.acquirer_data?.rrn || null,
                upiTransactionId: payment.acquirer_data?.upi_transaction_id || null,
            };



            await existingPayment.save();


            if (payment.status === 'captured') {
                if (order.status !== 'paid') {
                    throw new HttpException(400, 'Payment captured but order not marked as paid');

                }
                const result = await this.handleSuccessfulPayment(
                    razorpayOrderId,
                    razorpayPaymentId
                );

                return res.status(result.status).json(result);
            }

            if (payment.status === 'failed') {
                await PaymentModel.findOneAndUpdate(
                    { orderId: razorpayOrderId },
                    { status: 'failed' }
                );
                return res.status(400).json({ message: 'Payment failed' });
            }

            return res.status(202).json({
                message: `Payment processing - current status: ${payment.status}`,
                status: payment.status
            });

        } catch (error) {
            console.error('Payment verification error:', error);
            return res.status(500).json({ message: 'Payment processing failed' });
        }
    }

    public handleSuccessfulPayment = async (
        orderId: string,
        paymentId: string,
    ): Promise<{
        status: number; message: string; data?: any; error?: string
    }> => {

        const existingPayment = await PaymentModel.findOne({ orderId });
        if (existingPayment?.status === 'paid') {

            return {
                status: 200,
                message: 'Order payment completed',
            };
        }
        const paymentRecord = await PaymentModel.findOneAndUpdate({ orderId, status: { $ne: 'paid' } }, { paymentId, status: 'paid' }, { new: true });
        if (!paymentRecord?.modelName) {
            throw new HttpException(400, "Model name not found");
        }

        const modelNameFromPayload = paymentRecord.modelName;


        let Payout
        let updatedOrder
        if (modelNameFromPayload === 'Order') {

            try {

                updatedOrder = await OrderModel.findOneAndUpdate(
                    { orderId: orderId, paymentStatus: { $ne: 'paid' } },
                    {
                        paymentId: paymentId,
                        paymentStatus: 'paid',
                        orderStatus: 'confirmed'
                    },
                    { new: true }
                ).populate<{ storeId: StoreDocument }>('storeId');
                if (!updatedOrder) {
                    throw new HttpException(404, 'Order not found');
                }

                const commissionRate = 0.10;
                const commissionAmount = updatedOrder.totalPrice * commissionRate;
                const amountToSeller = updatedOrder.totalPrice - commissionAmount;

                updatedOrder.commissionAmount = commissionAmount;
                updatedOrder.amountToSeller = amountToSeller;

                Payout = await PayoutModel.create({
                    payoutAmount: amountToSeller,
                    currency: 'INR',
                    commission: commissionAmount,
                    razorpayFundAccountId: (updatedOrder.storeId as unknown as StoreDocument).razorpayFundAccountId,
                    storeId: (updatedOrder.storeId as unknown as StoreDocument)._id,
                    orderId: updatedOrder._id,
                    status: 'pending',
                    purpose: 'payout'
                });
                const productStockUpdates = updatedOrder.products.map(product => ({

                    updateOne: {
                        filter: { _id: product.productId },
                        update: { $inc: { stockLeft: -product.quantity } }

                    }
                }))
                const variantStockUpdates = updatedOrder.products.filter(product => product.productVariantId)
                    .map(product => ({
                        updateOne: {
                            filter: { _id: product.productVariantId },
                            update: { $inc: { stockLeft: -product.quantity } }
                        }
                    }))

                if (productStockUpdates.length) {
                    await Product.bulkWrite(productStockUpdates)
                }
                if (variantStockUpdates.length) {
                    await ProductVariant.bulkWrite(variantStockUpdates)
                }
                const finalOrder = await OrderModel.findByIdAndUpdate(
                    updatedOrder._id,
                    {
                        commissionAmount,
                        amountToSeller, payoutStatus: 'processed'
                    },
                    { new: true }
                );


                const payoutQueue = new Queue('payouts', {
                    connection: {
                        host: REDIS_HOST,
                        port: Number(REDIS_PORT),
                    },
                });

                await payoutQueue.add(
                    'processPayout',
                    {
                        payoutId: Payout._id.toString(),
                        amount: amountToSeller,
                        fundAccountId: updatedOrder.storeId.razorpayFundAccountId,
                        storeData: updatedOrder.storeId
                    },
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 5000,
                        },
                    }
                )



                return {
                    status: 200,
                    message: 'Order payment completed',
                    data: finalOrder

                }
            } catch (error) {

                console.log("==== Error in handlePayment Function =====")
                if (Payout) {
                    await PayoutModel.findByIdAndUpdate(
                        Payout[0]._id,
                        {
                            status: 'failed',
                            error: error.message?.substring(0, 500)
                        }
                    );
                    await OrderModel.findByIdAndUpdate(
                        updatedOrder._id,
                        { payoutStatus: 'failed' },
                    );
                }

                console.error('Payment processing error:', error);
                return {
                    status: 500,
                    message: 'Payment processing error',
                    error: error.stack

                }
            } finally {
                console.log("Finaly")
            }

        } else if (modelNameFromPayload === 'UserSubScription') {
            const updatedSubscription = await UserSubscriptionModel.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'paid',
                    isActive: true,
                    startDate: new Date(),
                    endDate: this.calculateEndDate(),
                    paymentId: paymentId
                },
                { new: true }
            );

            if (!updatedSubscription) {
                throw new HttpException(404, 'Subscription not found');
            }

            return {
                status: 200,
                message: 'Subscription payment completed',
                data: updatedSubscription
            }
        }

        throw new HttpException(400, 'Unknown payment type');
    }

    private calculateEndDate(): Date {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        return date;
    }



    public async handlePayoutWebhook(req: Request, res: Response) {
        const signature = req.headers['x-razorpay-signature'] as string;
        const payload = req.body;

        try {
            // Verify signature
            const generatedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAYX_WEBHOOK_SECRET)
                .update(JSON.stringify(payload))
                .digest('hex');

            if (generatedSignature !== signature) {
                return res.status(401).send('Invalid signature');
            }

            const payoutId = payload.payload.payout.entity.id;
            const status = payload.payload.payout.entity.status;

            // Update order status based on payout status
            await OrderModel.findOneAndUpdate(
                { payoutId },
                {
                    payoutStatus: status === 'processed' ? 'processed' : 'failed',
                    payoutDetails: payload.payload.payout.entity
                }
            );

            res.status(200).send('Webhook processed');
        } catch (error) {
            console.error('Payout webhook error:', error);
            res.status(500).send('Webhook processing failed');
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