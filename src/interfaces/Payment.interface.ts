import { Types } from 'mongoose'
export interface Payment {
    userId: string;
    orderId: string;
    amount: number;
    status: 'paid' | 'unpaid';
    paymentMethod: string;
    createdAt: Date;
    modelName: string;
    paymentId: string
}