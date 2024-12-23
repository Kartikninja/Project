import { IsNotEmpty, IsString } from "class-validator";
import {Types} from "mongoose"

export class FeatureandBenefitsDTO{
    @IsString({message:"title must be a string"})
    @IsNotEmpty({message:"Title is required"})
    title:string;

    @IsString({message:"description must be a string"})
    @IsNotEmpty({message:"description is required"})
    description:string;

    @IsString({message:"iconUrl must be a string"})
    @IsNotEmpty({message:"iconUrl is required"})
    iconUrl:string;

    
    // @IsNotEmpty({message:"industryId is required"})
    // industryId:Types.ObjectId;

    // @IsString({message:"category must be a string"})
    // @IsNotEmpty({message:"category is required"})
    // category:string;

    createdAt?: Date;
    updatedAt?: Date;
}


