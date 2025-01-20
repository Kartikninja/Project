import { Request, Response, NextFunction } from 'express';
import OrderService from '@services/Order.service';
import Container from 'typedi';
import { OrderModel } from '@/models/Order.model';
import { HttpException } from '@/exceptions/httpException';
import { StoreModel } from '@/models/Store.model';
import { ProductVariant } from '@/models/ProductVariant.model';

class OrderController {
    private orderService = Container.get(OrderService);

    public createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: userId } = req.user;
            const userRole = req.user.role
            if (userRole !== 1) {
                res.status(403).json({ message: 'You are not authorized to create an order' })
            }
            const orderData = req.body;
            const { order, payment } = await this.orderService.createOrder(userId, orderData);
            res.status(201).json({ data: order, paymentDetails: payment, message: 'Order created successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const order = await this.orderService.getOrderById(id);
            res.status(200).json({ data: order, message: 'Order retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getAllOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: userId } = req.user;
            const orders = await this.orderService.getAllOrders(userId);
            res.status(200).json({ data: orders, message: 'Orders retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public deleteOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            await this.orderService.deleteOrder(id);
            res.status(200).json({ message: 'Order deleted successfully' });
        } catch (error) {
            next(error);
        }
    };






    public updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: userId } = req.user;
            const { orderId } = req.params;
            const orderData = req.body;

            const updatedOrder = await this.orderService.updateOrder(userId, orderId, orderData);

            res.status(200).json({ data: updatedOrder, message: 'Order updated successfully' });
        } catch (error) {
            next(error);
        }
    };



    public updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { orderId, status } = req.body;
            const userId = req.user._id;
            const userRole = req.user.role;

            if (userRole !== 1) {
                res.status(403).json({ message: 'You are not authorized to update order status' });
            }


            const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({ message: 'Invalid order status' });
            }

            const updatedOrder = await this.orderService.updateOrderStatus(orderId, status);
            res.status(200).json({ data: updatedOrder, message: 'Order status updated successfully' });
        } catch (error) {
            next(error);
        }
    };

}

export default OrderController;
