import { Payment } from '@interfaces/Payment.interface'
import { Document } from 'mongoose';
import { model, Schema, Types } from 'mongoose';

const ObjectId = Schema.Types.ObjectId
const PaymentSchema: Schema = new Schema({
    userId: { type: ObjectId, ref: 'User', required: false },
    transactionId: { type: String, required: false },
    amount: { type: Number, required: false },
    status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
    paymentMethod: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    modelName: { type: String, require: false }
});

export const PaymentModel = model<Payment & Document>('Payment', PaymentSchema, 'Paymnets');
