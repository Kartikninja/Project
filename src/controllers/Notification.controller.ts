
import { Request, Response } from 'express';
import { NotificationService } from '@services/Notification.service';
import { Socket } from 'socket.io';
import Container from 'typedi';

export class NotificationController {
    private io: Socket;

    constructor(
        private readonly notificationService: NotificationService = Container.get(NotificationService)
    ) { }

    /**
     * Endpoint to create a notification
     * @param req - Express request
     * @param res - Express response
     */
    // public createNotification = async (req: Request, res: Response) => {
    //     try {
    //         const notificationData = req.body;
    //         const notification = await this.notificationService.createNotification(notificationData);
    //         res.status(201).json(notification);
    //     } catch (error) {
    //         res.status(500).json({ message: error.message });
    //     }
    // }

    /**
     * Endpoint to get notifications for a user or store
     * @param req - Express request
     * @param res - Express response
     */
    public getNotifications = async (req: Request, res: Response) => {
        try {
            const { modelName, id } = req.params; // modelName ('User' or 'Store') and id (userId or storeId)
            const notifications = await this.notificationService.getNotifications(modelName, id);
            res.status(200).json(notifications);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Endpoint to mark a notification as read
     * @param req - Express request
     * @param res - Express response
     */
    public markAsRead = async (req: Request, res: Response) => {
        try {
            const { notificationId } = req.params;
            const notification = await this.notificationService.markAsRead(notificationId);
            res.status(200).json(notification);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    public sendNotification = async (req: Request, res: Response) => {
        try {
            const { modelName, id, message, type, createdBy } = req.body;
            const notificationData = await this.notificationService.sendAdminNotification(modelName, id, message, type, createdBy);
            res.status(200).json({ message: 'Notification sent', data: notificationData });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

}

