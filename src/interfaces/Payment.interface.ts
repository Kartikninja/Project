import { Types } from 'mongoose'
export interface Payment {
    userId: string;
    transactionId: string;
    amount: number;
    status: string;
    paymentMethod: string;
    createdAt: Date;
}