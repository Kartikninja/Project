import mongoose, { Schema, model, Types, Document } from 'mongoose';
import { FeatureAndBenefits } from '@/interfaces/featureandbenefits.interface';

const FeatureAndBenefitsSchema = new Schema({
  title: {
    type: String,
    required: true,
    unique:true
  },
  description: {
    type: String,
    required: true
  },
  iconUrl: {
    type: String,
    required: true
  },
  industryId: {
    type: Types.ObjectId,
    ref: 'Industry', 
    required: true
  },
  category: {
    type: String,
    
  }
}, { timestamps: true });


export const FeatureAndBenefitsModel = mongoose.model<FeatureAndBenefits & Document>('FeatureAndBenefits', FeatureAndBenefitsSchema);


