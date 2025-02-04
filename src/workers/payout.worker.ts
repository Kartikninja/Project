// src/workers/payout.worker.ts
import { Worker } from 'bullmq';
import { PayoutService } from '@services/payout.service';
import { Container } from 'typedi';
import { PayoutModel } from '@/models/Payout.model';
import { REDIS_HOST, REDIS_PORT } from '@config';
import Razorpay from 'razorpay';
import { OrderModel } from '@/models/Order.model';
import { PaymentModel } from '@/models/Payment.model';

const razorpayX = new Razorpay({
    key_id: "rzp_test_kghAwVX1ISLmoi",
    key_secret: "NnB5pXhUXLranWMEUPuF31L4",

})

export function initializePayoutWorker() {
    console.log("Worker")
    const worker = new Worker('payouts', async job => {
        const { payoutId, amount, fundAccountId, storeData } = job.data;
        const payoutService = Container.get(PayoutService);

        try {
            await PayoutModel.findByIdAndUpdate(payoutId, {
                status: 'processing',
                processingStartedAt: new Date()
            });

            const payoutResponse = await payoutService.amoutToSeller(
                fundAccountId,
                amount,
                storeData
            );



            await PayoutModel.findByIdAndUpdate(payoutId, {
                status: 'processed',
                razorpayPayoutId: payoutResponse.id,
                utr: payoutResponse.utr,
                processedAt: new Date(),
                error: null,
            });



        } catch (error) {
            await PayoutModel.findByIdAndUpdate(payoutId, {
                status: 'failed',
                error: error.message.substring(0, 500),
                retryCount: job.attemptsMade
            });

            if (job.attemptsMade >= (job.opts?.attempts || 0)) {
                await PayoutModel.findByIdAndUpdate(payoutId, {
                    status: 'failed'
                });
            }
            throw error;
        }
    }, {
        connection: {
            host: REDIS_HOST,
            port: Number(REDIS_PORT),
        },
        limiter: {
            max: 10,
            duration: 1000
        }
    });

    worker.on('completed', job => {
        console.log(`Payout processed for job ${job.id}`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Payout failed for job ${job?.id}:`, err);
    });

    return worker;
}




export function initializeRefundWorker() {
    console.log("Refund Worker Initialized");
    const worker = new Worker('refund', async job => {
        const { refundId, paymentId, refundAmount, userId, orderId } = job.data
        const refundService = Container.get(PayoutService)
        try {

            const refundResult = await refundService.payoutReversal(job.data)
            console.log("initializeRefundWorker refundResult", refundResult)
            if (refundResult?.success) {
                const payment = await PaymentModel.findOne({ paymentId });

                if (payment) {
                    payment.amountRefunded += refundAmount;
                    payment.refundStatus = refundAmount === payment.amount ? 'refunded' : 'partial';
                    payment.refundId = refundId;
                    await payment.save();
                    console.log('Payment updated with refund details.');
                } else {
                    console.log('Payment not found for refund update.');
                }

                const order = await OrderModel.findOne({ orderId });

                if (order) {
                    order.refundStatus = refundAmount === order.totalPrice ? 'refunded' : 'partial';
                    order.refundId = refundId;
                    await order.save();
                    console.log('Order updated with refund details.');
                } else {
                    console.log('Order not found for refund update.');
                }
            } else {
                console.error('Refund processing failed:', refundResult.error);
            }
        }
        catch (err) {
            console.error(err)
        }
    }, {
        connection: {
            host: REDIS_HOST,
            port: Number(REDIS_PORT),
        },
        limiter: {
            max: 10,
            duration: 1000
        }
    });

    worker.on('completed', job => {
        console.log(`Payout processed for job ${job.id}`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Payout failed for job ${job?.id}:`, err);
    });

    return worker;


}