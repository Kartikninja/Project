import { Service } from 'typedi';
import { PaymentModel } from '@models/Payment.model';
import { Payment } from '@interfaces/Payment.interface';
import { HttpException } from '@exceptions/httpException';
import Razorpay from 'razorpay';

const razorpayInstance = new Razorpay({
    key_secret: "22ZNfSFxTpBBr5U9ycVU19zW",
    key_id: "rzp_test_ly2znj2ybm1Qqm"
})

// [convert]:: ToBase64String([System.Text.Encoding]:: UTF8.GetBytes("rzp_test_ly2znj2ybm1Qqm:22ZNfSFxTpBBr5U9ycVU19zW"))

// echo - n "rzp_test_ly2znj2ybm1Qqm:22ZNfSFxTpBBr5U9ycVU19zW" | base64


// cnpwX3Rlc3RfWXFHWmJ6UWlMMDhXMUI6TEhuZTE5TE1MMzNtYlBVa1hUWFJUOGxn

@Service()
export class PaymentService {



    public async createRazorpayOrder(amount: number, userId: string, paymentMethod: string, modelName: string): Promise<Payment> {
        try {
            const options = {
                amount: amount * 100,
                currency: 'INR',
                receipt: `order_receipt_${new Date().getTime()}`,
                payment_capture: 1,
            };

            const order = await razorpayInstance.orders.create(options)
            console.log("payment createRazorpayOrder", order)
            const paymentData: Payment = {
                userId,
                transactionId: order.id,
                amount,
                status: 'unpaid',
                paymentMethod,
                modelName,
                createdAt: new Date(),
            };
            const newPayment = await this.createPayment(paymentData);
            return newPayment;


        } catch (error) {
            console.log("Error ", error)
            throw new HttpException(404, "Error in Paymnet RazorPay")
        }
    }



    public async createPayment(paymentData: Payment): Promise<Payment> {
        try {
            const newPayment = new PaymentModel(paymentData);
            console.log("newPayment", newPayment)
            await newPayment.save();
            return newPayment;
        } catch (error) {
            throw new HttpException(500, 'Error creating payment');
        }
    }

    public async updatePaymentStatus(transactionId: string, status: string): Promise<Payment | null> {
        try {
            const payment = await PaymentModel.findOneAndUpdate(
                { transactionId },
                { status },
                { new: true }
            );

            if (!payment) throw new HttpException(404, 'Payment not found');

            return payment;
        } catch (error) {
            throw new HttpException(500, 'Error updating payment status');
        }
    }





    public async getAllPaymnet() {
        const getAll = await PaymentModel.find()
        return getAll
    }




}
