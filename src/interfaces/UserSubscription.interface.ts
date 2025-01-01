export interface UserSubscription {
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
}
