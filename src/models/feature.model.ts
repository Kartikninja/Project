import mongoose, { Schema,Document } from "mongoose";
import {Feature} from "@interfaces/feature.interface";
import {Types} from "mongoose"

const CostEstimateSchema = new Schema({
    minCost:{ type:Number, required:true },
    maxCost:{ type:Number, required:true }
});

const TimeEstimateSchema = new Schema({
    minTime:{ type:Number, required:true},
    maxTime:{ type:Number, required:true},
    unit:{ type:String, required:true},
});

const FeatureSchema = new Schema({
    id:{type:String, required:true},
    moduleId:{type:mongoose.Types.ObjectId, ref:"Module", required:true},
    appId:{type: Types.ObjectId, ref:"ReferenceApp", required:true},
    industryId:{type:Types.ObjectId, ref:"Industry", required:true},
    name:{type:String, required:true},
    description:{type:String, required:true},
    isCommonFeature: { type: Boolean, required: true },
    costEstimate: { type: CostEstimateSchema,required: true},
    timeEstimate: { type: TimeEstimateSchema,required: true},
    isKeyFeature:{
        type:Boolean,
        default: function(){
            return this.industryId ? true:false
        }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export  const FeatureModel = mongoose.model<Feature & Document>('Feature', FeatureSchema);
