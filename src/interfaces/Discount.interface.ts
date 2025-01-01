import { Document } from 'mongoose';
import { Discount_TYPE } from '@/utils/constant';

export interface IDiscount extends Document {
    storeId: string;
    code: string;
    discount_type: Discount_TYPE;
    start_date: Date;
    end_date: Date;
    value: number;
    unit: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    ProductIds: string[]
    CategoryIds: string[]
    SubCategoryIds: string[]
}
