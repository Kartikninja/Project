import { model, Schema, Document } from 'mongoose';
import { StoreDocument } from '@interfaces/Store.interface';

const StoreSchema: Schema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        storeName: {
            type: String,
            required: true
        },
        storeImage: [{
            type: String,
            required: false
        }],
        storeDescription: {
            type: String,
            required: false
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true,
            },
        },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        isActive: {
            type: Boolean,
            default: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true, versionKey: false }
);

StoreSchema.index({ location: '2dsphere' })

export const StoreModel = model<StoreDocument & Document>('Store', StoreSchema, 'Stores');
