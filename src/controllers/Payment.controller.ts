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
import razorpay from 'razorpay';
import { PaymentModel } from '@/models/Payment.model';
import { SubscriptionModel } from '@/models/Subscription.model';



export const razorpayInstance = new razorpay({
    key_secret: "lo7Fxm311KWXISgLQ1o7upqg",
    key_id: "rzp_test_kHxQU3N0KPE61T"
})

export class PaymentController {
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





    public async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<Response> {
        console.log('Request Body:', req.body);
        const { razorpayPaymentId, razorpayOrderId, razorpaySignature, modelName } = req.body;
        console.log('razorpay_payment_id:', razorpayPaymentId);
        console.log('razorpayOrderId:', razorpayOrderId);
        console.log('razorpaySignature:', razorpaySignature);

        const body = razorpayOrderId + '|' + razorpayPaymentId;

        const secretKey = 'lo7Fxm311KWXISgLQ1o7upqg';
        const generatedSignature = crypto
            .createHmac('sha256', secretKey)
            .update(body)
            .digest('hex');

        console.log('Generated Signature:', generatedSignature);
        console.log('Received Signature:', razorpaySignature);

        if (generatedSignature !== razorpaySignature) {
            console.log('Signature mismatch');
            throw new HttpException(400, 'Invalid signature');
        }

        try {

            const payment = await razorpayInstance.payments.fetch(razorpayPaymentId);
            console.log('Payment Status:', payment.status);

            if (payment.status === 'captured') {


                const updatedPayment = await PaymentModel.findOneAndUpdate(
                    { transactionId: razorpayOrderId },
                    { status: 'paid' },
                    { new: true }
                );

                if (!updatedPayment) {
                    console.error('Payment not found for transactionId:', razorpayOrderId);
                    throw new HttpException(404, 'Payment record not found');
                }


                if (modelName === 'Order') {
                    const updatedOrder = await OrderModel.findOneAndUpdate(
                        { transactionId: razorpayOrderId },
                        { paymentStatus: 'paid', orderStatus: 'confirmed' },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        console.error('Order not found for transactionId:', razorpayOrderId);
                        throw new HttpException(404, 'Order record not found');
                    }
                    console.log("Order status Update successfull")
                    return res.status(200).json({ message: 'Order Payment verified successfully', updatedOrder })

                }
                else if (modelName === 'SubScription') {

                    const updatedSubscription = await UserSubscriptionModel.findOneAndUpdate(
                        { transactionId: razorpayOrderId },
                        { paymentStatus: 'paid' },
                        { new: true }
                    );

                    if (!updatedSubscription) {
                        console.warn('Subscription not found for transactionId:', razorpayOrderId);

                    }
                    console.log("Subscription status Update successfull")
                    return res.status(200).json({ message: 'Subscription Payment verified successfully', updatedSubscription })
                }

                return res.status(200).json({
                    message: 'Payment verified successfully',
                    updatedPayment

                });
            } else {
                console.log('Payment not captured');
                throw new HttpException(400, 'Payment verification failed');
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            throw new HttpException(500, 'Error verifying payment');
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

