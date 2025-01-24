

import { Schema, model, Document } from 'mongoose';

interface Payout extends Document {
    amount: number;
    currency: string;
    fundAccountId: string;
    storeId: Schema.Types.ObjectId;
    razorpayPayoutId: string;
    status: string;
    fees: number;
    utr: string;
    purpose: string;
}

const PayoutSchema = new Schema<Payout>({
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    fundAccountId: { type: String, required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    razorpayPayoutId: { type: String, required: true },
    status: { type: String, default: 'pending' },
    fees: Number,
    utr: String,
    purpose: { type: String, default: 'payout' }
}, { timestamps: true });

export const PayoutModel = model<Payout>('Payout', PayoutSchema);





// import { Schema, model } from "mongoose";

// const PayoutSchema = new Schema(
//     {
//         storeId: {
//             type: Schema.Types.ObjectId,
//             ref: "Store",
//             required: true,
//         },
//         amount: {
//             type: Number,
//             required: true,
//         },
//         status: {
//             type: String,
//             enum: ["requested", "approved", "paid"],
//             default: "requested",
//         },
//         requestedAt: {
//             type: Date,
//             default: Date.now,
//         },
//         paidAt: {
//             type: Date,
//         },
//     },
//     { timestamps: true }
// );

// export const PayoutModel = model("Payout", PayoutSchema);

