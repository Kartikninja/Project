// src/workers/payout.worker.ts
import { Queue, Worker } from 'bullmq';
import { PayoutService } from '@services/payout.service';
import { Container } from 'typedi';
import { PayoutModel } from '@/models/Payout.model';
import { REDIS_HOST, REDIS_PORT } from '@config';
import Razorpay from 'razorpay';
import { OrderModel } from '@/models/Order.model';
import { PaymentModel } from '@/models/Payment.model';
import { Product } from '@/models/Product.model';
import { StoreModel } from '@/models/Store.model';
import axios from 'axios';
import { UserModel } from '@/models/users.model';

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


export function initializeShippingWorker() {
    const worker = new Worker('shipping', async (job) => {
        try {
            const { orderId, productId, trackingNumber, storeId } = job.data;

            console.log("Call initializeShippingWorker")
            const order = await OrderModel.findById(orderId);
            const product = await Product.findById(productId);
            const store = await StoreModel.findById(order.storeId);
            const storeOwner = store ? store.fullName : 'Store Owner Name'
            // console.log(`this is order ${order} this is product ${product} this is store ${store} and this is `)
            if (!order || !product || !store || !storeOwner) {
                throw new Error("Required data not found");
            }

            // Handle different job types
            switch (job.name) {
                case 'processShipping':
                    await handleShippedStatus(orderId, productId, trackingNumber, store);
                    await scheduleNextJob('processOutForDelivery', orderId, productId, trackingNumber, 2 * 60 * 1000);
                    break;

                case 'processOutForDelivery':
                    await handleOutForDeliveryStatus(orderId, productId, trackingNumber);
                    await scheduleNextJob('processDelivered', orderId, productId, trackingNumber, 3 * 60 * 1000);
                    break;

                case 'processDelivered':
                    await handleDeliveredStatus(orderId, productId, trackingNumber);
                    break;
            }
        } catch (error) {
            console.error(`Job ${job.id} failed:`, error);
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


    worker.on('completed', (job) => console.log(`Job for initializeShippingWorker${job.id} completed`));
    worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err));

    return worker;
}


async function handleShippedStatus(orderId: string, productId: string, trackingNumber: string, store: any) {
    await OrderModel.findByIdAndUpdate(orderId, {
        $set: {
            'products.$[elem].shippingStatus': 'shipped',
            'products.$[elem].trackingNumber': trackingNumber,
            'products.$[elem].shippedAt': new Date(),
            'products.$[elem].deliveryAgentName': store.fullName,
            'products.$[elem].deliveryAgentPhone': store.mobile,
            'products.$[elem].estimatedDelivery': new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
        orderStatus: 'shipped'

    }

        , { arrayFilters: [{ 'elem.productId': productId }] });
    console.log("handleShippedStatus")
}

async function handleOutForDeliveryStatus(orderId: string, productId: string, trackingNumber: string) {
    await OrderModel.findByIdAndUpdate(orderId, {
        $set: {
            'products.$[elem].shippingStatus': 'out_for_delivery',
            'products.$[elem].trackingNumber': trackingNumber
        },
        orderStatus: 'out_for_delivery'
    }, { arrayFilters: [{ 'elem.productId': productId }] });
    console.log("handleOutForDeliveryStatus");
}

async function handleDeliveredStatus(orderId: string, productId: string, trackingNumber: string) {
    await OrderModel.findByIdAndUpdate(orderId, {
        $set: {
            'products.$[elem].shippingStatus': 'delivered',
            'products.$[elem].deliveredAt': new Date(),
            'products.$[elem].trackingNumber': trackingNumber
        },
        orderStatus: 'delivered'
    }, { arrayFilters: [{ 'elem.productId': productId }] });
    console.log("handleDeliveredStatus")
}

async function scheduleNextJob(jobName: string, orderId: string, productId: string, trackingNumber: string, delay: number) {
    const shippingQueue = new Queue('shipping', {
        connection: {
            host: REDIS_HOST,
            port: Number(REDIS_PORT),
        }
    });
    await shippingQueue.add(jobName, { orderId, productId, trackingNumber }, { delay });
    console.log("scheduleNextJob")
}



// export function initializeShippingWorker() {
//     console.log("Shipping Worker initialized");

//     const worker = new Worker('shipping', async job => {
//         const { productId, trackingNumber, quantity, shippingAddress, storeId, orderId } = job.data;

//         try {
//             const product = await Product.findById(productId);
//             if (!product) throw new Error("Product not found");

//             const store = await StoreModel.findById(storeId);
//             if (!store) throw new Error("Store not found");

//             const order = await OrderModel.findById(orderId);
//             if (!order) throw new Error("Order not found");

//             const shippingDetails = {
//                 courierPartner: 'Internal Carrier',
//                 estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
//                 trackingNumber: trackingNumber,
//                 shippingAddress: shippingAddress,
//                 quantity: quantity,
//             };

//             await OrderModel.findByIdAndUpdate(orderId, {
//                 $set: {
//                     'products.$[elem].shippingStatus': 'shipped',
//                     'products.$[elem].trackingNumber': trackingNumber,
//                     'products.$[elem].estimatedDelivery': shippingDetails.estimatedDelivery,
//                 }
//             }, {
//                 arrayFilters: [{ 'elem.productId': productId }],
//             });

//             console.log(`Shipping processed for product ${productId} with tracking number ${trackingNumber}`);

//         } catch (error) {
//             console.error(`Shipping processing failed for product ${productId}:`, error);


//             throw error;
//         }
//     }, {
//         connection: {
//             host: REDIS_HOST,
//             port: Number(REDIS_PORT),
//         },
//         limiter: {
//             max: 10,
//             duration: 1000
//         }
//     });

//     worker.on('completed', job => {
//         console.log(`Shipping processed for job ${job.id}`);
//     });

//     worker.on('failed', (job, err) => {
//         console.error(`Shipping failed for job ${job?.id}:`, err);
//     });

//     return worker;
// }



