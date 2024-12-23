import { Types } from 'mongoose';

export interface FeatureAndBenefits {
    title: string;
    description: string;
    iconUrl:string;
    industryId?:Types.ObjectId;
    category?:string;
    createdAt?:Date;
    updatedAt?:Date;

}