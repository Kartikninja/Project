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
    orderId: string
    paymentStatus: 'paid' | 'unpaid'
    price: number
    razorpaySubscriptionId: string
}


export interface UserPurchaseSubScription {
    fullName: string
    email: string

}
