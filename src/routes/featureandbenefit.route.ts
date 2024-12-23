import {Router} from "express";
import { FeatureAndBenefitsController } from "@/controllers/featureandbenefits.controller";
import { Routes } from "@/interfaces/routes.interface";
import { ValidationMiddleware } from "@/middlewares/validation.middleware";
import { FeatureandBenefitsDTO } from "@/dtos/featureandbenefit.dto";

export class FeatureAndBenefitsRoute implements Routes{
    public path = '/feature-benefits';
    public router= Router();
    public app = new FeatureAndBenefitsController();

    constructor(){
        this.initializeRoutes()
    }

    private initializeRoutes(){
        this.router.get(`${this.path}`, this.app.getAllFeaturesAndBenefits)
        this.router.post(`${this.path}/add`,ValidationMiddleware(FeatureandBenefitsDTO) ,this.app.addFeatureAndBenefits)
    }
}
