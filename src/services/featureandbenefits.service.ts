import { Service } from "typedi";
import { FeatureAndBenefits } from "@/interfaces/featureandbenefits.interface";
import { FeatureAndBenefitsModel } from "@/models/featureandbenefits.model";
import { HttpException } from "@/exceptions/httpException";

@Service()


export class FeatureAndBenefitsService {
   
    public async addFeatureAndBenefits(featureandbenefitsData: FeatureAndBenefits): Promise<{ feature: FeatureAndBenefits }> {
        
        const findTitle = await FeatureAndBenefitsModel.findOne({ title: featureandbenefitsData.title });
        
        if (findTitle) {
            throw new HttpException(400, `The Feature and Benefits "${featureandbenefitsData.title}" already exists`);
        } else {
           
            const createFeatureAndBenefitsData = await FeatureAndBenefitsModel.create(featureandbenefitsData);
            return { feature: createFeatureAndBenefitsData };
        }
    }

    
    public async getAllFeaturesAndBenefits(industryId?: string,category?: string): Promise<FeatureAndBenefits[]> {
        const filter: any = {};
        if (industryId) {
            filter.industryId = industryId;
        }
        if (category) {
            filter.category = category;
        }
        
        return await FeatureAndBenefitsModel.find(filter);
    }
}
