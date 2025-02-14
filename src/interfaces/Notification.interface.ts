import { ObjectId } from 'mongoose';
import { Document } from 'mongodb';

export interface Notification {
    _id?: ObjectId;
    modelName: 'User' | 'Store' | 'Order' | 'UserSubscription' | 'Subscription';
    userId?: ObjectId;
    storeId?: ObjectId;
    OrderId?: ObjectId;
    usersubScriptionId?: ObjectId
    subScriptionId?: ObjectId;
    message: string;
    type: 'Update-order-status' | 'user - registered' | 'user - login' | 'admin - notification' | 'new- order' |
    "User-Reset-password" | 'User-Update-Profile' | "Delete-User" | 'Create-Store' |
    'order-updated' | 'User-Forgot-password' | 'User-Buy-subscription' | 'Order-delete' | 'user-logout';
    isRead: boolean;
    createdBy: 'System' | 'Admin' | 'User' | 'StoreOwner' | ObjectId;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date
}

export interface NotificationDocument extends Notification, Document { }
