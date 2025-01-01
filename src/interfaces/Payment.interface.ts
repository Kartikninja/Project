import { Types } from 'mongoose'
export interface Payment {
    userId: string;
    transactionId: string;
    amount: number;
    status: 'paid' | 'unpaid';
    paymentMethod: string;
    createdAt: Date;
}