import { Types } from 'mongoose';

interface ICostEstimate {
  minCost: number;
  maxCost: number;
}
interface ITimeEstimate {
  minTime: number;
  maxTime: number;
  unit: string;
}
export interface Feature {
  id: string;
  moduleId: Types.ObjectId;
  appId?: Types.ObjectId;
  industryId?: Types.ObjectId;
  name: string;
  description: string;
  isCommonFeature: boolean;
  costEstimate: ICostEstimate;
  timeEstimate: ITimeEstimate;
  isKeyFeature: boolean;
  createdAt: Date;
  updatedAt: Date;
}
