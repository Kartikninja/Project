
import { NotificationModel } from '@models/Notification.model';
import { Server, Socket } from 'socket.io';
import { Logger } from '@utils/logger';
import Container, { Service } from 'typedi';


@Service()
export class NotificationService {
    private io: Server;

    public getIO(): Server {
        if (!this.io) {
            try {
                this.io = Container.get<Server>('io');
                console.log("Socket.IO initialized and set in container");
            } catch (error) {
                console.warn('Socket.IO not available yet, will retry on next emission');
            }
        }
        return this.io;
    }
    public async sendAdminNotification(modelName: string,
        message: string,
        type: string,
        createdBy: string,
        userId?: string,
        storeId?: string,
        orderId?: string,
        usersubScriptionId?: string,
        subScriptionId?: string
    ) {
        const notificationData = {
            modelName,
            userId,
            storeId,
            orderId,
            usersubScriptionId: usersubScriptionId,
            subScriptionId,
            message,
            type,
            createdBy,
            isRead: false
        };
        console.log('Notification data:', notificationData);

        try {
            await NotificationModel.create(notificationData);
            console.log(`Notification saved to database: ${message}`);

            return notificationData;
        } catch (error) {
            console.error('Failed to save notification:', error);
        }
    }


    public async createNotification(data: any) {
        try {
            console.log('\n=== Creating Notification ===');
            console.log('User ID:', data.userId);
            console.log('Type:', data.type);
            console.log('Message:', data.message);
            const notification = await NotificationModel.create(data);
            const room = data.modelName === 'Store' ? `store_${data.storeId}` : `user_${data.userId}`;
            const io = this.getIO()
            io.to(room).emit('notification', notification);
            console.log("room", room)
            if (data.modelName === 'User') {
                this.io.to(data.userId.toString()).emit('notification', notification);
            } else if (data.modelName === 'Store') {
                this.io.to(data.storeId.toString()).emit('notification', notification);
            }

            return notification;
        } catch (error) {
            Logger.error('Error creating notification:', error);
            throw new Error('Error creating notification');
        }
    }

    /**
     * Fetch all notifications for a user or store
     * @param modelName - 'User' or 'Store'
     * @param id - userId or storeId
     */
    public async getNotifications(modelName: string, id: string) {
        try {
            const notifications = await NotificationModel.find({
                modelName,
                [`${modelName.toLowerCase()}Id`]: id,
            });

            return notifications;
        } catch (error) {
            Logger.error('Error fetching notifications:', error);
            throw new Error('Error fetching notifications');
        }
    }

    /**
     * Mark a notification as read
     * @param notificationId - The notification ID to mark as read
     */
    public async markAsRead(notificationId: string) {
        try {
            const notification = await NotificationModel.findByIdAndUpdate(
                notificationId,
                { isRead: true },
                { new: true }
            );

            return notification;
        } catch (error) {
            Logger.error('Error marking notification as read:', error);
            throw new Error('Error marking notification as read');
        }
    }
}

