import { Service } from 'typedi';
import { PaymentModel } from '@models/Payment.model';
import { Payment } from '@interfaces/Payment.interface';
import { HttpException } from '@exceptions/httpException';
import Razorpay from 'razorpay';

const razorpayInstance = new Razorpay({
    key_secret: "Loxg9gQiFNEQcSHzSg0bCRsn",
    key_id: "rzp_test_Oheg9xnyyzc6SB"
})

@Service()
export class PaymentService {



    public async createRazorpayOrder(amount: number, userId: string, paymentMethod: string): Promise<Payment> {
        try {
            const options = {
                amount: amount * 100,
                currency: 'INR',
                receipt: `order_receipt_${new Date().getTime()}`,
                payment_capture: 1,
            };

            const order = await razorpayInstance.orders.create(options)
            const paymentData: Payment = {
                userId,
                transactionId: order.id,
                amount,
                status: 'pending',
                paymentMethod,
                createdAt: new Date(),
            };
            const newPayment = await this.createPayment(paymentData);
            console.log("CreateRazorPayOrder Succes")
            return newPayment;


        } catch (error) {
            console.log("Error ", error)
            throw new HttpException(404, "Error in Paymnet RazorPay")
        }
    }



    public async createPayment(paymentData: Payment): Promise<Payment> {
        try {
            const newPayment = new PaymentModel(paymentData);
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







}
