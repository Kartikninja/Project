import { StoreModel } from "@/models/Store.model";
import { StoreService } from "@/services/Store.service";
import { NextFunction, Request, Response } from "express";
import Container from "typedi";

export class StoreController {
    private storeService = Container.get(StoreService)



    public CreateStore = async (req: Request, res: Response, next: NextFunction) => {
        const { storeName, storeDescription, location, subscription, discountApplied } = req.body;
        const userId = req.user._id
        const userRole = req.user.role
        if (userRole !== 3) {
            res.status(403).json({ message: "You are not authorized to create a store" })

        }
        try {
            const store = await this.storeService.createStore(userId, req.body);

            res.status(201).json({
                data: { store },
                message: 'Store created and user updated successfully',
                status: true
            });
        } catch (error) {
            next(error);
        }
    }

    public getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const getAll = await this.storeService.getAll()
            res.json({ status: true, message: "Get All", getAll })
        } catch (error) {
            next(error);
        }
    }

    public getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id
            const store = await this.storeService.getById(id)
            res.json({ status: true, message: "Get By Id", store })
        } catch (error) {
            next(error);
        }
    }

    public delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id
            const store = await this.storeService.delete(id)
            res.json({ status: true, message: "Delete", store })
        } catch (error) {
            next(error)
        }
    }

    public UpdateStore = async (req: Request, res: Response, next: NextFunction) => {
        const storeId = req.params.storeId;
        const { storeName, storeDescription, location, isActive } = req.body;

        try {
            const updatedStore = await this.storeService.updateStore(storeId, req.body)

            if (!updatedStore) {
                return res.status(404).json({ message: 'Store not found', status: false });
            }

            res.status(200).json({
                data: updatedStore,
                message: 'Store updated successfully',
                status: true
            });
        } catch (error) {
            next(error);
        }
    };


    public approveStore = async (req: Request, res: Response, next: NextFunction) => {
        const { storeId } = req.params;

        try {

            const updatedStore = await this.storeService.approveStore(storeId);

            res.status(200).json({
                data: updatedStore,
                message: 'Store has been approved successfully.',
            });
        } catch (error) {
            next(error);
        }
    };

    public rejectStore = async (req: Request, res: Response, next: NextFunction) => {
        const { storeId } = req.params;
        try {
            const updatedStore = await this.storeService.rejectStore(storeId);
            res.status(200).json({
                data: updatedStore,
                message: 'Store has been rejected successfully.',
            });
        } catch (error) {
            next(error);

        }
    }






    public getNearbyStores = async (req: Request, res: Response) => {
        try {
            const { userId } = req.query;
            const maxDistance = parseInt(req.query.maxDistance as string) || 5000;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            const result = await this.storeService.getNearbyStores(
                userId as string,
                maxDistance,
                page,
                limit
            );

            res.status(200).json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    };



}