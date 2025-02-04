import { Schema, model, Document } from 'mongoose';
import { Order } from '@interfaces/Order.interface'

const OrderSchema: Schema = new Schema<Order>(
    {
        order_Id: {
            type: String,
            required: false,
            unique: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true
        },
        products: [
            {
                productId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true
                },
                price: {
                    type: Number,
                    required: false
                },
                productVariantId: {
                    type: Schema.Types.ObjectId,
                    ref: 'ProductVariant',
                    required: true
                },
            }
        ],
        totalPrice: {
            type: Number,
            required: false
        },
        orderStatus: {
            type: String,
            enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
            default: 'pending'
        },
        paymentStatus: {
            type: String,
            enum: ['paid', 'unpaid', 'refunded'],
            default: 'unpaid'
        },
        shippingAddress: {
            type: String,
            required: true
        },
        orderId: { type: String, required: false },
        paymentId: { type: String, required: false, default: null },
        discountCode: { type: String, required: false },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        commissionAmount: { type: Number, required: false, default: 0 },
        amountToSeller: { type: Number, required: false, default: 0 },

        payoutStatus: { type: String, enum: ['pending', 'processed', 'processing', 'rejected', 'reversed', "queued", "failed"], default: 'pending' },
        taxAmount: { type: Number, default: 0 },
        shippingCost: { type: Number, default: 0 },
        refundId: { type: String, required: false },
        refundStatus: { type: String, enum: ['refunded', 'partial'] }

    },
    {
        timestamps: true
    }
);

export const OrderModel = model<Order & Document>('Order', OrderSchema, 'Orders');

