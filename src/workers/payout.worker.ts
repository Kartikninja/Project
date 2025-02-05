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
    console.log("Worker initialized");

    const worker = new Worker('payouts', async job => {
        const { payoutId, amount, fundAccountId, storeData } = job.data;
        const payoutService = Container.get(PayoutService);

        try {
            const payoutRecord = await PayoutModel.findById(payoutId);
            if (!payoutRecord) throw new Error("Payout record not found");

            const order = await OrderModel.findOne({ _id: payoutRecord.DatabaseOrderId, storeId: storeData._id });

            if (!order || order.orderStatus === 'cancelled' || order.refundStatus === 'refunded' || order.paymentStatus === 'unpaid') {
                await PayoutModel.findByIdAndUpdate(payoutId, {
                    status: 'failed',
                    error: "Order was cancelled before payout",
                    refundId: order.refundId || null,

                });
                return;
            }

            await PayoutModel.findByIdAndUpdate(payoutId, {
                status: 'processing',
                processingStartedAt: new Date(),
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
            order.payoutStatus = 'processed'
            await order.save()
        } catch (error) {
            console.error(`Payout processing failed:`, error);
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
