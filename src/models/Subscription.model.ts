import { Subscription } from "@/interfaces/Subscription.interface";
import { SUBSCRIPTIONS_TYPES } from "@/utils/constant";
import { model, Schema, Document } from "mongoose";

const SubscriptionSchema: Schema = new Schema({
    name: { type: String, required: true },
    type: {
        type: Number,
        required: true,
        enum: SUBSCRIPTIONS_TYPES,
        default: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    benefite: {
        type: [String],
        required: true
    },

    isActive: {
        type: Boolean,
        deflate: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

export const SubscriptionModel = model<Subscription & Document>('Subscription', SubscriptionSchema, 'Subscriptions')