import { NextFunction, Request, Response } from 'express';
import { Container } from 'typedi';
import { ReferenceAppService } from '@/services/referenceApp.service';

export class ReferenceAppController {
  public referenceService = Container.get(ReferenceAppService);

  public getAllReferenceApps = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const searchTerm = req.query.appName as string | undefined;
      const industryId = req.query.industryId as string | undefined;

      const referenceApps = await this.referenceService.getAllReferenceApps(searchTerm, industryId);

      return res.status(200).json(referenceApps);
    } catch (error) {
      next(error); 
    }
  };

  public addReferenceApp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appData = req.body;
      const newReferenceApp = await this.referenceService.addReferenceApp(appData);

      return res.status(200).json(newReferenceApp);
    } catch (error) {
      next(error);
    }
  };

  public getReferenceApp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const referenceApp = await this.referenceService.getReferenceAppById(id);

      return res.status(200).json(referenceApp);
    } catch (error) {
      next(error)
    }
  };

  public updateReferenceApp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const appData = req.body;

      const updateReferenceApp = await this.referenceService.updateReferenceApp(id, appData);

      return res.status(200).json(updateReferenceApp)
    } catch (error) {
      next(error)
    }
  };

  public deleteReferenceApp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const deletedReferenceApp = await this.referenceService.deleteReferenceApp(id);

      return res.status(200).json({ message: 'Reference app deleted successfully', app: deletedReferenceApp });
    } catch (error) {
      next(error)
    }
  }
}
