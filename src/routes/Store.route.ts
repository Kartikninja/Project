import { StoreController } from "@/controllers/Store.controller";
import { Routes } from "@/interfaces/routes.interface";
import { AuthMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";

export class StoreRoute implements Routes {
    public path = '/store';
    public router = Router();
    public store = new StoreController()

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}/add`, AuthMiddleware, this.store.CreateStore);
        this.router.get(`${this.path}/getAll`, this.store.getAll)
        this.router.get(`${this.path}/:id`, this.store.getById)
        this.router.delete(`${this.path}/:id`, this.store.delete)
        this.router.put(`${this.path}/approve/:storeId`, AuthMiddleware, this.store.approveStore);


        this.router.get(`${this.path}/nearBy/Location`, this.store.getNearbyStores)

    }





}