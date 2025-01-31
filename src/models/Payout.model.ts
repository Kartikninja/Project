

import { Schema, model, Document } from 'mongoose';

interface Payout extends Document {
    payoutAmount: number;
    currency: string;
    razorpayFundAccountId: string;
    storeId: Schema.Types.ObjectId;
    razorpayPayoutId: string;
    status: 'pending' | 'processed' | 'processing' | 'rejected' | 'reversed' | "queued" | "failed";
    orderId: Schema.Types.ObjectId
    utr: string;
    purpose: 'payout' | 'refund' | 'other';
    error: string
    commission: number;
    initiatedAt: Date;
    processedAt: Date;
    transactionId: string




    fee?: number;
    tax?: number;
    status_details: {
        description: string;
        source: string;
        reason: string;
    };
    mode: string;
    narration: string

}

const PayoutSchema = new Schema<Payout>({
    payoutAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    razorpayFundAccountId: { type: String, required: true },
    commission: { type: Number, required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    razorpayPayoutId: { type: String, required: false },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    status: { type: String, enum: ['pending', 'processed', 'processing', 'queued', 'rejected', 'reversed', 'failed'], default: 'pending' },
    error: { type: String, maxlength: 500 },
    utr: { type: String, default: null, required: false },
    purpose: { type: String, enum: ['payout', 'refund', 'other'], default: 'payout' },
    initiatedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    transactionId: { type: String, default: null },


    fee: { type: Number },
    tax: { type: Number, required: false },
    status_details: {
        description: { type: String, required: false },
        source: { type: String, required: false },
        reason: { type: String, required: false },
    },
    mode: { type: String, required: false },
    narration: { type: String, required: false }
}, { timestamps: true });

export const PayoutModel = model<Payout>('Payout', PayoutSchema);
