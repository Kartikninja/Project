
import { Schema, model, Document } from 'mongoose';
import { Industry } from '@interfaces/industry.interface';
import { BaseCostRange } from '@interfaces/industry.interface';

const BaseCostRangeSchema = new Schema<BaseCostRange>({
    minCost: { type: Number, required: true },
    maxCost: { type: Number, required: true }
});



const IndustrySchema = new Schema<Industry & Document>({
    id: { type: String },
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    baseCostRange: { type: BaseCostRangeSchema },
    isActive: { type: Boolean, default: false },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    deletedAt: { type: Date, default: null }

}, { timestamps: true });

export const IndustryModel = model<Industry & Document>('Industry', IndustrySchema);
