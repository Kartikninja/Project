import { Schema, model } from 'mongoose';
import { NotificationDocument } from '@interfaces/Notification.interface';

const NotificationSchema: Schema = new Schema(
    {
        modelName: {
            type: String,
            enum: ['User', 'Store', 'Order', 'UserSubscription', 'Subscription'],
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: function () {
                return this.modelName === 'User';
            },

        },
        usersubScriptionId: {
            type: Schema.Types.ObjectId,
            ref: 'UserSubscription',
            required: function () {
                return this.modelName === 'UserSubscription';
            },
        },

        subScriptionId: {
            type: Schema.Types.ObjectId,
            ref: 'Subscription',
            required: function () {
                return this.modelName === 'Subscription';
            },
        },
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: function () {
                return this.modelName === 'Store';
            },
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: function () {
                return this.modelName === 'Order'
            }

        },
        message: {
            type: String,
            required: false,
        },
        type: {
            type: String,
            enum: ['User-Buy-subscription', 'user-registered', 'user-login', 'admin-notification', 'new-order', 'order-updated', 'User-Forgot-password', "User-Reset-password", 'User-Update-Profile', "Delete-User"],
            default: 'info',
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: Schema.Types.Mixed,
            default: 'System',
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        }
    },
    { timestamps: true, versionKey: false }
);

export const NotificationModel = model<NotificationDocument>('Notification', NotificationSchema);
