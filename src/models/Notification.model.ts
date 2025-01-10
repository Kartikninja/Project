import { Schema, model } from 'mongoose';
import { NotificationDocument } from '@interfaces/Notification.interface';

const NotificationSchema: Schema = new Schema(
    {
        modelName: {
            type: String,
            enum: ['User', 'Store'],
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: function () {
                return this.modelName === 'User';
            },
        },
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: function () {
                return this.modelName === 'Store';
            },
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['info', 'success', 'warning', 'error'],
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
