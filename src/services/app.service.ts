import { Service } from "typedi";
import { App } from "@/interfaces/app.interface";
import { AppModel } from "@/models/app.model";
import { HttpException } from "@/exceptions/httpException";

@Service()
export class AppService {
    public async findAppByName(appName:string): Promise<App>{
        const app = await AppModel.findOne({ appName }).exec();
        if(!app) throw new HttpException(404, "Project doesn't exist")
        return app;
    }

    public async createApp(appData:App): Promise<{app:App}>{
        const findName: App = await AppModel.findOne({appName:appData.appName});

        if (findName) throw new HttpException(404, `This project ${appData.appName} already exists`);

        else {
           appData.appName = appData.appName.toLowerCase();
           const createAppData : App = await AppModel.create(appData)
           return {app:createAppData};
        }
    }

    public async deleteApp(appName: string): Promise<{ message: string }> {
        const findApp: App = await AppModel.findOne({ appName }).exec();
        if (!findApp) throw new HttpException(404, `App with name ${appName} not found`);
        
        await AppModel.deleteOne({ appName }).exec();
        return { message: `App ${appName} successfully deleted` };
    }

    public async updateApp(appName: string, appData: Partial<App>): Promise<{ app: App }> {
        const findApp: App = await AppModel.findOne({ appName }).exec();
        if (!findApp) throw new HttpException(404, `App with name ${appName} not found`);

        const updatedApp = await AppModel.findOneAndUpdate(
            { appName },
            { $set: appData }, 
            { new: true }       
        ).exec();

        if (!updatedApp) throw new HttpException(500, 'Failed to update the app');
        return { app: updatedApp };
    }

}