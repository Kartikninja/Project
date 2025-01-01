import { Router } from "express";
import { UserSubscriptionController } from "@/controllers/UserSubscription.controller";
import { Routes } from "@/interfaces/routes.interface";  // Interface
import { ValidationMiddleware } from "@/middlewares/validation.middleware";
import { CreateUserSubscriptionDto } from "@/dtos/UserSubscription .dto";
import { AuthMiddleware } from "@/middlewares/auth.middleware";

export class UserSubscriptionRoute implements Routes {
    public path = '/userSubscription';
    public router = Router();
    public userSubscriptionController = new UserSubscriptionController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}/:subscriptionId`, AuthMiddleware, this.userSubscriptionController.add);
        this.router.get(`${this.path}/getAll`, this.userSubscriptionController.getAll)
        this.router.get(`${this.path}/:id`, this.userSubscriptionController.getById)
        this.router.delete(`${this.path}/:id`, this.userSubscriptionController.delete)
    }
}
