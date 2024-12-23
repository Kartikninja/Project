import { IsString, IsBoolean, IsNotEmpty, IsObject, ValidateNested, IsNumber, Min, Max, IsOptional, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { body } from 'express-validator';

class BaseCostRangeDTO {
    @IsNumber()
    @Min(0, { message: 'minCost must be a positive number' })
    minCost: number;

    @IsNumber()
    @Max(0, { message: 'maxCost must be a positive number' })
    maxCost: number;
}


export class IndustryDTO {
    @IsString({ message: "name must be a string" })
    @IsNotEmpty({ message: 'Industry name is required' })
    name: string;

    @IsString({ message: "description must be a string" })
    @IsNotEmpty({ message: 'Industry description is required' })
    description: string;

    @IsNotEmpty({ message: 'Industry imageUrl is required' })
    imageUrl: string;

    @IsObject()
    @ValidateNested()
    baseCostRange: BaseCostRangeDTO;

    @IsBoolean()
    @IsOptional()
    isActive: boolean;

    @IsOptional()
    @IsString()
    _id: string;


    @IsOptional()
    createdAt: Date;

    @IsOptional()
    updatedAt: Date;

    @IsOptional()
    deletedAt: Date;
}



