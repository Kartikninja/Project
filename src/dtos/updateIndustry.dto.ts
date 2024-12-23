import { IsString, IsObject, IsOptional, IsUrl, IsBoolean } from 'class-validator';

export class UpdateIndustryDTO {
    @IsString()
    @IsOptional()
    name: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsOptional()
    imageUrl: string;

    @IsObject()
    @IsOptional()
    baseCostRange: {
        minCost: number;
        maxCost: number;
    };

    @IsBoolean()
    @IsOptional()
    isActive: boolean;
}
