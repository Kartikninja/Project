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
    key_secret: "22ZNfSFxTpBBr5U9ycVU19zW",
    key_id: "rzp_test_ly2znj2ybm1Qqm"
})

// $ echo - n "rzp_test_ly2znj2ybm1Qqm:22ZNfSFxTpBBr5U9ycVU19zW" | base64








// {
//     "account_number": "50100102283912",
//         "fund_account_id": "fa_PmpnVsPqkVYbT2",
//             "amount": 1000000,
//                 "currency": "INR",
//                     "mode": "IMPS",
//                         "purpose": "refund",
//                             "queue_if_low_balance": true,
//                                 "reference_id": "Acme Transaction ID 12345",
//                                     "narration": "Acme Corp Fund Transfer",
//                                         "notes": {
//         "notes_key_1": "Tea, Earl Grey, Hot",
//             "notes_key_2": "Tea, Earl Grey… decaf."
//     }
// }


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





    // webhook secret: Kartik02@
    public async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<Response> {
        console.log('Request Body:', req.body);
        const { razorpayPaymentId, razorpayOrderId, razorpaySignature, modelName } = req.body;
        const body = razorpayOrderId + '|' + razorpayPaymentId;

        const secretKey = '22ZNfSFxTpBBr5U9ycVU19zW';
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

