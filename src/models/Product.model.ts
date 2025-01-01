

import { model, Schema, Document } from 'mongoose'
import ProductInterface from '@interfaces/Product.interface'

const ProductSchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
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
                return this.stockQuantity
            }
        },
        images: [{
            type: String,
            required: false
        }],
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true
        },
        subCategoryId: {
            type: Schema.Types.ObjectId,
            ref: 'SubCategory',
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
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
        timestamps: true
    }
);

export const Product = model<ProductInterface & Document>('Product', ProductSchema, 'Products');

