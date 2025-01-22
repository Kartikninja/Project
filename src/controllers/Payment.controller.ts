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
import { Product } from '@/models/Product.model';


export const razorpayInstance = new razorpay({
    key_secret: "LHne19LML33mbPUkXTXRT8lg",
    key_id: "rzp_test_YqGZbzQiL08W1B"
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



    public getAllPaymnet = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const getAll = await this.paymentService.getAllPaymnet()
            res.status(201).json(getAll)
        } catch (err) {
            next(err)
        }
    }




    public async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<Response> {
        console.log('Request Body:', req.body);
        const { razorpayPaymentId, razorpayOrderId, razorpaySignature, modelName } = req.body;

        const body = razorpayOrderId + '|' + razorpayPaymentId;

        const secretKey = 'LHne19LML33mbPUkXTXRT8lg';
        const generatedSignature = crypto
            .createHmac('sha256', secretKey)
            .update(body)
            .digest('hex');


        if (generatedSignature !== razorpaySignature) {

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


                    for (const product of updatedOrder.products) {
                        const { productId, productVariantId, quantity } = product

                        const updateProductVarinatQuantity = await ProductVariant.findById(productVariantId)
                        updateProductVarinatQuantity.stockLeft -= quantity
                        await updateProductVarinatQuantity.save()

                        const updateProductQuantity = await Product.findById(productId)
                        updateProductQuantity.stockLeft -= quantity
                        await updateProductQuantity.save()

                    }


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
                        { paymentStatus: 'paid', isActive: true },

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

