import { Payment } from '@interfaces/Payment.interface'
import { Document } from 'mongoose';
import { model, Schema, Types } from 'mongoose';

const ObjectId = Schema.Types.ObjectId
const PaymentSchema: Schema = new Schema({
    userId: { type: ObjectId, ref: 'User', required: true },
    transactionId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export const PaymentModel = model<Payment & Document>('Payment', PaymentSchema, 'Paymnets');
