import { Schema } from "mongoose";

export interface OrderProduct {
    productId: Schema.Types.ObjectId;
    quantity: number;
    price: number;
    productVariantId: Schema.Types.ObjectId;
}

export interface Order {
    orderId: string;
    userId: Schema.Types.ObjectId;
    storeId: Schema.Types.ObjectId;
    products: OrderProduct[];
    totalPrice: number;
    orderStatus: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    paymentStatus: 'paid' | 'unpaid';
    shippingAddress: string;
    createdAt: Date;
    updatedAt: Date;
    transactionId: string
    discountCode: string
}
