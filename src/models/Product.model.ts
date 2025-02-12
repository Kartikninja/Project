

import { model, Schema, Document } from 'mongoose'
import ProductInterface from '@interfaces/Product.interface'
import { SubCategory } from './SubCategory.model';
import { Category } from './Category.model';

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
        },
        refundPolicy: { type: String, enum: ['no-refund', '7-days', '30-days', 'custom'], default: 'no-refund' },
        replacementPolicy: { type: String, enum: ['no-replacement', '7-days', '30-days', 'custom'], default: 'no-replacement' },
        customPolicyDetails: { type: String, required: false }
    },
    {
        timestamps: true
    }
);



ProductSchema.pre('save', async function (next) {
    if (!this.refundPolicy || !this.replacementPolicy) {
        try {


            const subCategory = await SubCategory.findById(this.subCategoryId)
            if (subCategory) {
                if (!this.refundPolicy) {

                    this.refundPolicy = subCategory.refundPolicy
                }
                if (!this.replacementPolicy) {
                    this.replacementPolicy = subCategory.replacementPolicy;
                }
            }

            if (!this.refundPolicy || !this.replacementPolicy) {
                const category = await Category.findById(subCategory.categoryId);
                if (category) {
                    if (!this.refundPolicy) {
                        this.refundPolicy = category.refundPolicy;
                    }
                    if (!this.replacementPolicy) {
                        this.replacementPolicy = category.replacementPolicy;
                    }
                }
            }
        } catch (err) {
            console.error('Error setting default policies:', err);

        }
    }
    next()
})

ProductSchema.index({ name: "text", description: "text" }, { weights: { name: 10, description: 5 } });

ProductSchema.index({ storeId: 1, subCategoryId: 1, price: 1 });
ProductSchema.index({ storeId: 1, createdAt: -1 });

ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ stockLeft: 1 });

export const Product = model<ProductInterface & Document>('Product', ProductSchema, 'Products');

