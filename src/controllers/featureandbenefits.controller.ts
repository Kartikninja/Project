import { Request,Response,NextFunction } from "express";
import {Container} from "typedi";
import { FeatureAndBenefitsService } from "@/services/featureandbenefits.service";

export class FeatureAndBenefitsController{
    public FandBService = Container.get(FeatureAndBenefitsService);

    public addFeatureAndBenefits = async(req: Request, res: Response, next: NextFunction)=>{
        try {
            const FandBData = req.body;
            const newFeatureandBenefits = await this.FandBService.addFeatureAndBenefits(FandBData);

            return res.status(200).json(newFeatureandBenefits)
        } catch (error) {
            next(error)
        }
    };

    public getAllFeaturesAndBenefits= async(req: Request, res: Response, next: NextFunction)=>{
        try {
            const industryId = req.query.industryId as string | undefined;
            const category = req.params.category as string | undefined;

            const featureandbenefits = await this.FandBService.getAllFeaturesAndBenefits(industryId, category);

            return res.status(200).json(featureandbenefits)
        } catch (error) {
            next(error)
        }
    }
}