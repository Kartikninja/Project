import { Document } from "mongoose";

export interface UserSubscription extends Document {
    userId: string;
    subscriptionId: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    isAutoRenew: boolean;
    createdAt: Date;
    updatedAt: Date;
    expiry: Date | null
    transactionId: string
    paymentStatus: 'paid' | 'unpaid'
    price: number
}


export interface UserPurchaseSubScription {
    fullName: string
    email: string

}
