import { Service } from 'typedi';
import { ReferenceApp } from '@/interfaces/reference.interface';
import { ReferenceAppModel } from '@/models/reference.model';
import { HttpException } from '@/exceptions/httpException';

@Service()
export class ReferenceAppService {
  public async getAllReferenceApps(searchterm?: string, industryId?: string): Promise<ReferenceApp[]> {
    const query: any = {};
    if (searchterm) {
      query.appName = { $regex: searchterm, $options: 'i' };
    }
    if (industryId) {
      query.industryId = industryId;
    }

    return await ReferenceAppModel.find(query);
  }

  public async addReferenceApp(appData: ReferenceApp): Promise<{ app: ReferenceApp }> {
    const findName: ReferenceApp = await ReferenceAppModel.findOne({ appName: appData.appName });
    if (findName) {
      throw new HttpException(400, `The reference app "${appData.appName}" already exists`);
    } else {
      const createReferenceAppData: ReferenceApp = await ReferenceAppModel.create(appData);
      return { app: createReferenceAppData };
    }
  }

  public async getReferenceAppById(id: string): Promise<ReferenceApp> {
    const referenceApp = await ReferenceAppModel.findById(id);

    if (!referenceApp) {
      throw new HttpException(404, `Reference app not found with id: ${id}`);
    }

    return referenceApp;
  }

  public async updateReferenceApp(id: string, appData: Partial<ReferenceApp>): Promise<ReferenceApp> {
    const updatedApp = await ReferenceAppModel.findByIdAndUpdate(id, appData, { new: true, runValidators: true });
    if (!updatedApp) {
      throw new HttpException(404, `Reference app not found with id: ${id}`);
    }
    return updatedApp;
  }

  public async deleteReferenceApp(id: string): Promise<ReferenceApp> {
    const deletedApp = await ReferenceAppModel.findByIdAndDelete(id);
    if (!deletedApp) {
      throw new HttpException(404, `Reference app not found with id: ${id}`);
    }
    return deletedApp;
  }
}


