import { model, Schema, Document } from 'mongoose';
import ProductVariantInterface from '@interfaces/ProductVariant.interface';

const ProductVariantSchema: Schema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },

        price: {
            type: Number,
            required: true
        },
        stockQuantity: {
            type: Number,
            required: true,
            default: 0
        },
        stockLeft: {
            type: Number,
            required: false,
            default: function () {
                return this.stockQuantity;
            }
        },
        images: [
            {
                type: String,
                required: false
            }
        ],
        userId: {
            type: Schema.Types.ObjectId,
            required: false,
            ref: 'User'
        },
        storeId: {
            type: Schema.Types.ObjectId,
            required: false,
            ref: "Store"
        },
        attributes: {
            size: { type: String, required: false },
            color: { type: String, required: false },
            material: { type: String, required: false },

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
    {
        timestamps: true,

    }
);




export const ProductVariant = model<ProductVariantInterface & Document>('ProductVariant', ProductVariantSchema, 'ProductVariants');
