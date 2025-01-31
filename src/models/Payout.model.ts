

import { Schema, model, Document } from 'mongoose';

interface Payout extends Document {
    payoutAmount: number;
    currency: string;
    razorpayFundAccountId: string;
    storeId: Schema.Types.ObjectId;
    razorpayPayoutId: string;
    status: 'pending' | 'processed' | 'failed' | 'reversed', "success";
    orderId: Schema.Types.ObjectId
    utr: string;
    purpose: 'order-payout' | 'refund' | 'other';
    error: string
    commission: number;
    initiatedAt: Date;
    processedAt: Date;
    transactionId: string

}

const PayoutSchema = new Schema<Payout>({
    payoutAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    razorpayFundAccountId: { type: String, required: true },
    commission: { type: Number, required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    razorpayPayoutId: { type: String, required: false },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    status: { type: String, enum: ['pending', 'processed', 'success', 'failed', 'reversed'], default: 'pending' },
    error: { type: String, maxlength: 500 },
    utr: String,
    purpose: { type: String, enum: ['order-payout', 'refund', 'other'], default: 'order-payout' },
    initiatedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    transactionId: { type: String, default: null }
}, { timestamps: true });

export const PayoutModel = model<Payout>('Payout', PayoutSchema);
