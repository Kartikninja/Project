import { Types } from 'mongoose';

interface BaseCostEstimate{
    minCost: number;
    maxCost: number;
    tentativeTime: string; 
}

export interface ReferenceApp {
  appName: string;
  industryId: Types.ObjectId; 
  description:string;
  imageUrl:string;    
  baseCostEstimate: BaseCostEstimate;
  isActive:boolean;
  createdAt:Date;
  updatedAt:Date
}