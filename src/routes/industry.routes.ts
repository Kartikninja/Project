import { Router } from 'express';
import { IndustryController } from '@controllers/industry.controller';
import { Routes } from '@interfaces/routes.interface';
import { ValidationMiddleware } from '@/middlewares/validation.middleware';
import { IndustryDTO } from '@/dtos/industry.dto';
import { UpdateIndustryDTO } from '@/dtos/updateIndustry.dto';


export class IndustryRouter implements Routes {
    public path = '/industry';
    public router = Router();
    public industry = new IndustryController;

    constructor() {
        this.initializeRoutes();
        console.log('IndustryController:', this.industry);

    }

    private initializeRoutes() {
        this.router.post(`${this.path}/addIndustry`, ValidationMiddleware(IndustryDTO), this.industry.addIndustryData)
        this.router.get(`${this.path}/getIndusatryData`, this.industry.getIndusatryData)
        this.router.get(`${this.path}/getIndusatryDataById/:id`, this.industry.getindustryDataById)
        this.router.delete(`${this.path}/delete/:id`, this.industry.deleteIndustry)
        this.router.put(`${this.path}/updateIndustry/:id`, ValidationMiddleware(UpdateIndustryDTO), this.industry.updateIndustry)
    }

}


