import mongoose, { Schema } from "mongoose";
import {ReferenceApp} from "@interfaces/reference.interface";
import {Types} from "mongoose"

const BaseCostEstimateSchema = new Schema({
    minCost:{
        type:Number,
        required:true
    },
    maxCost:{
        type:Number,
        required:true
    },
    tentativeTime:{
        type:String,
        required:true
    }
})

const referenceAppSchema = new Schema({
    appName: {
        type:String,
        required:true
    },
    industryId: {
        type:Types.ObjectId,
        ref:"Industry",
        required:true
    }, 
    description:{
        type:String,
        required:true
    },
    imageUrl:{
        type:String,
        required:true
    },    
    baseCostEstimate: {
        type:BaseCostEstimateSchema,
        required:true
    },
    isActive:{
        type:Boolean,
        default:true
    },
    createdAt:{
        type:Date
    },
    updatedAt:{
        type:Date
    }
},{timestamps:true});

export const ReferenceAppModel = mongoose.model<ReferenceApp>("ReferenceApp", referenceAppSchema)

