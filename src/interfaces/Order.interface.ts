import { Schema } from "mongoose";

export interface OrderProduct {
    productId: Schema.Types.ObjectId;
    quantity: number;
    price: number;
    productVariantId: Schema.Types.ObjectId;
}

export interface Order {
    order_Id: string;
    paymentId: string
    userId: Schema.Types.ObjectId;
    storeId: Schema.Types.ObjectId;
    products: OrderProduct[];
    totalPrice: number;
    orderStatus: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    paymentStatus: 'paid' | 'unpaid' | 'refunded';
    shippingAddress: string;
    createdAt: Date;
    updatedAt: Date;
    orderId: string
    discountCode: string
    taxAmount: number;
    shippingCost: number;
    commissionAmount: number
    amountToSeller: number
    payoutStatus: 'pending' | 'processed' | 'processing' | 'rejected' | 'reversed' | "queued" | "failed"
    refundId: string


    refundStatus: 'refunded' | 'partial'
}
