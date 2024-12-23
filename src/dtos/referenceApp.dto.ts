import { IsBoolean, IsDefined, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';

class BaseCostEstimateDTO {
  @IsNumber()
  @Min(0, { message: 'minCost must be a positive number' })
  minCost: number;

  @IsNumber()
  @Max(0, { message: 'maxCost must be positive number' })
  maxCost: number;

  @IsString({ message: 'tentativeTime must be a string' })
  tentativeTime: string;
}

export class ReferenceAppDTO {
  @IsString({ message: 'appName must be a string' })
  @IsNotEmpty({ message: 'appName is required' })
  appName: string;

  @IsNotEmpty({ message: 'industryId is required' })
  industryId: Types.ObjectId;

  @IsString({ message: 'description must be a string' })
  @IsNotEmpty({ message: 'description is required' })
  description: string;

  @IsString({ message: 'imageUrl must be a valid URL' })
  @IsNotEmpty({ message: 'imageUrl is required' })
  imageUrl: string;

  @ValidateNested()
  baseCostEstimate: BaseCostEstimateDTO;

  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export class UpdateReferenceAppDTO {
    @IsString()
    @IsOptional()
    appName?: string;
  
    @IsDefined({ message: 'industryId is required' })
    industryId: Types.ObjectId;
  
    @IsString()
    @IsOptional()
    description?: string;
  
    @IsString()
    @IsOptional()
    imageUrl?: string;
  
    @ValidateNested()
    @IsOptional() 
    baseCostEstimate?: BaseCostEstimateDTO;
  
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
  }