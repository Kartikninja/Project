
import { Service } from 'typedi';
import { Industry } from '@interfaces/industry.interface';
import { IndustryModel } from '@models/industry.model'
import { HttpException } from '@exceptions/httpException';
import { Types } from 'mongoose'



@Service()
export class IndustryService {
    public async addIndustryData(industryData: Industry): Promise<Industry> {

        const existingIndustry = await IndustryModel.findOne({ name: industryData.name });
        if (existingIndustry) {

            throw new HttpException(400, 'Industry already exists');
        }
        const newIndustry = await IndustryModel.create({
            name: industryData.name,
            description: industryData.description,
            imageUrl: industryData.imageUrl,
            isActive: industryData.isActive ?? false,
            baseCostRange: industryData.baseCostRange

        });
        return newIndustry;
    }



    public async getIndusatryData(): Promise<Industry[]> {

        try {
            return await IndustryModel.find()

        } catch (error) {
            throw new HttpException(404, "Industry Not found")
        }
    }

    public async getindustryDataById(id: string): Promise<Industry | null> {
        try {
            return await IndustryModel.findById(id)

        } catch (error) {
            throw new HttpException(404, "Industry Not found")
        }
    }
    public async deleteIndustry(id: string): Promise<Industry | null> {
        try {
            const deleteIndustry = await IndustryModel.findByIdAndDelete(id)
            return deleteIndustry

        } catch (error) {
            throw new HttpException(404, 'Error in Upadting Industry Data')
        }

    }

    public async updateIndustry(id: string, updateData: Partial<Industry>): Promise<Industry | null> {
        console.log("IndustryID", id)
        const existingIndustry = await IndustryModel.findById(id).exec();
        if (!existingIndustry) {
            console.log("Industry not found for ID:", id);
            throw new HttpException(404, `Industry with ID ${id} not found`);
        }
        if (updateData.name) {
            const nameConflict = await IndustryModel.findOne({ name: updateData.name, _id: { $ne: id } });
            if (nameConflict) {
                throw new HttpException(400, 'Name already exists, please choose another name.');
            }
        }
        try {
            const updatedIndustry = await IndustryModel.findByIdAndUpdate(id,
                updateData, { new: true }
            )
            return updatedIndustry

        } catch (error) {
            console.error("Error updating industry:", error.message);
            throw new HttpException(500, error.message || 'An unknown error occurred while updating the industry');


        }

    }

}