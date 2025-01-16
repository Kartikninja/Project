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
    type: 'user-registered' | 'user-login' | 'admin-notification' | 'new-order' |
    "User-Reset-password" | 'User-Update-Profile' | "Delete-User" |
    'order-updated' | 'User-Forgot-password' | 'User-Buy-subscription';
    isRead: boolean;
    createdBy: 'System' | 'Admin' | ObjectId;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date
}

export interface NotificationDocument extends Notification, Document { }
