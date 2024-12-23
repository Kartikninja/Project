import { Router } from 'express';
import { ReferenceAppController } from '@/controllers/referenceapp.controller';
import { Routes } from '@interfaces/routes.interface';
import { ValidationMiddleware } from '@/middlewares/validation.middleware';
import { ReferenceAppDTO, UpdateReferenceAppDTO } from '@/dtos/referenceApp.dto';

export class ReferenceAppRoute implements Routes {
  public path = '/app';
  public router = Router();
  public app = new ReferenceAppController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, this.app.getAllReferenceApps);
    this.router.get(`${this.path}/:id`, this.app.getReferenceApp);
    this.router.post(`${this.path}/add-app`, ValidationMiddleware(ReferenceAppDTO), this.app.addReferenceApp);
    this.router.put(`${this.path}/update-app/:id`, ValidationMiddleware(UpdateReferenceAppDTO), this.app.updateReferenceApp);
    this.router.delete(`${this.path}/delete-app/:id`, this.app.deleteReferenceApp);
  }
}
