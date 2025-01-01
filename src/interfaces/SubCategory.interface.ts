import { model, Schema, Document } from 'mongoose';

export interface SubCategoryInterface extends Document {
    name: string;
    description: string;
    images: string[];
    categoryId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}