import { SubCategoryInterface } from "@/interfaces/SubCategory.interface";
import { model, Schema, Document } from "mongoose";

const SubCategorySchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        images: [
            {
                type: String,
                required: false,
            },
        ],
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
    },
    {
        timestamps: true,
    }
);

export const SubCategory = model<SubCategoryInterface & Document>('SubCategory', SubCategorySchema);