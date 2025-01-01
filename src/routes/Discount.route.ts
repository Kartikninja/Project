import { DiscountController } from "@/controllers/Discount.controller";
import { Routes } from "@/interfaces/routes.interface";
import { AuthMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";

export class DiscountRouter implements Routes {
    public path = '/discounts';
    public router = Router();

    public discount = new DiscountController()


    constructor() {
        this.intializeRoutes();
    }
    intializeRoutes() {
        this.router.post(`${this.path}`, AuthMiddleware, this.discount.createDiscount);
        this.router.get(`${this.path}`, this.discount.getDiscountsByStoreId);
        this.router.put(`${this.path}/:discountId`, AuthMiddleware, this.discount.updateDiscount);
        this.router.delete(`${this.path}/:discountId`, AuthMiddleware, this.discount.deleteDiscount);

    }

}