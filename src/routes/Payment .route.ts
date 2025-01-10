import { PaymentController } from "@/controllers/Payment.controller";
import { Routes } from "@/interfaces/routes.interface";
import { Router } from "express";

export class PaymentRouter implements Routes {
    public path = '/payment'
    public router = Router()
    public payment = new PaymentController()


    constructor() {
        this.intializeRouter()
    }
    private intializeRouter() {
        this.router.post(`${this.path}/create`, this.payment.createPayment)
        this.router.put(`${this.path}/update-status`, this.payment.updatePaymentStatus)

        this.router.post(`${this.path}/createRazorPay`, this.payment.createRazorpayPayment)

        this.router.post(`${this.path}/verify/payment`, this.payment.verifyPayment)
    }

}


// this.router.post(`${this.path}/webhook`, this.payment.razorpayWebhook)



//     public async razorpayWebhook(req: Request, res: Response, next: NextFunction): Promise < Response > {
//     const secret = 'Kartik02@';
//     const body = JSON.stringify(req.body);
//     const razorpaySignature = req.headers['x-razorpay-signature'] as string;
//     const razorpayTimestamp = req.headers['x-razorpay-timestamp'] as string;


//     console.log("Received Signature:", razorpaySignature);
//     console.log("Razorpay Timestamp:", razorpayTimestamp);

//     const generatedSignature = crypto
//         .createHmac('sha256', secret)
//         .update(body)
//         .digest('hex');

//     console.log("Generated Signature:", generatedSignature);
//     if(generatedSignature !== razorpaySignature) {
//     return res.status(400).json({ message: 'Invalid signature' });
// }

// try {
//     const event = req.body.event;
//     const paymentDetails = req.body.payload.payment.entity;
//     const transactionId = paymentDetails.id;

//     if (event === 'payment.captured') {
//         await this.paymentService.updatePaymentStatus(paymentDetails.id, 'success');
//         await this.userSubscriptionService.activateUserSubscription(paymentDetails.id);
//         await this.paymentService.updatePaymentStatus(transactionId, 'paid');
//         const updatedOrder = await OrderModel.findOneAndUpdate(
//             { transactionId },
//             { paymentStatus: 'paid', orderStatus: 'confirmed' },
//             { new: true }
//         );
//         await UserSubscriptionModel.findOneAndUpdate(
//             { transactionId: paymentDetails.id },
//             { isActive: true },
//             { new: true }
//         );
//         if (updatedOrder) {
//             await Promise.all(
//                 updatedOrder.products.map(async (product) => {
//                     await ProductVariant.findByIdAndUpdate(product.productId, {
//                         $inc: { stock: -product.quantity },
//                     });
//                 })
//             );
//         }
//     } else if (event === 'payment.failed') {
//         await this.paymentService.updatePaymentStatus(paymentDetails.id, 'failed');
//         await this.paymentService.updatePaymentStatus(transactionId, 'failed');
//         await OrderModel.findOneAndUpdate(
//             { transactionId },
//             { paymentStatus: 'failed', orderStatus: 'canceled' }
//         );
//     }


//     return res.status(200).json({ message: 'Webhook received successfully' });
// } catch (error) {
//     next(error);
// }
//     }

