import { ObjectId } from 'mongoose';
import { Document } from 'mongodb';

export interface Notification {
    _id?: ObjectId;
    modelName: 'User' | 'Store';
    userId?: ObjectId;
    storeId?: ObjectId;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isRead: boolean;
    createdBy: 'System' | 'Admin' | ObjectId;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date
}

export interface NotificationDocument extends Notification, Document { }
