import { CategoryInterface } from '@/interfaces/Category.interface';
import { model, Schema, Document } from 'mongoose';

const CategorySchema: Schema = new Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        description: { type: String, trim: true },
        images: { type: [String], default: [] },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',

        },
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
        },

    },
    { timestamps: true }
);

export const Category = model<Document & CategoryInterface>('Category', CategorySchema, 'Categories');
