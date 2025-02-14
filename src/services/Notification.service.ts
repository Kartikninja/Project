
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
    /**
     * Reusable function to send notifications
     * @param {Object} data - Notification data
     * @param {string} data.modelName - 'User' | 'Store' | 'Order' | 'Subscription'
     * @param {string} data.message - Notification message
     * @param {string} data.type - 'new-order' | 'store-approved' | 'product-added' | 'order-cancelled' etc.
     * @param {string} data.createdBy - 'User' | 'StoreOwner' | 'Admin'
     * @param {string} [data.userId] - User ID (optional)
     * @param {string} [data.storeId] - Store ID (optional)
     * @param {string} [data.orderId] - Order ID (optional)
     * @param {string} [data.subScriptionId] - Subscription ID (optional)
     */
    public async sendNotification(data: {
        modelName: 'User' | 'Store' | 'Order' | 'UserSubscription' | 'Subscription';
        type: 'User-Cancel-SubScription' | 'User-Purchase-SubScription' | 'SubScription-Deleted' | 'SubScription-Created' | 'Reject-Store' | 'Approve-Store' | 'Update-Store' | 'Delete-Store' | 'Store-Reset-Password' | 'Store-Forgot-Password' | 'Login-Store' | 'Create-Store' | 'user-logout' | 'Update-order-status' | 'User-Buy-subscription' | 'user-registered' | 'user-login' | 'admin-notification' | 'new-order' | 'order-updated' | 'order-cancelled' | 'User-Forgot-password' | 'User-Reset-password' | 'User-Update-Profile' | 'Delete-User' | 'Order-delete';
        createdBy: 'User' | 'StoreOwner' | 'Admin';
        userId?: string;
        storeId?: string;
        orderId?: string;
        subScriptionId?: string;
        usersubScriptionId?: string;
        metadata?: Record<string, any>;
    }) {
        try {
            console.log('\n=== Sending Notification ===');
            console.log('Type:', data.type);

            let storeMessage = '';
            let adminMessage = '';
            let userMessage = '';

            let room = ''
            if (data.modelName === 'User') {
                room = `user_${data.userId}`
            } else if (data.modelName === "Store") {
                room = `store_${data.storeId}`;
            } else if (data.modelName === "Order") {
                room = `order_${data.orderId}`;
            }

            switch (data.type) {
                case 'new-order':
                    storeMessage = `New order from user ${data.userId}`;
                    adminMessage = `New order received for store ${data.storeId}`;
                    break;

                case 'order-updated':
                    storeMessage = `Order ${data.orderId} has been updated`;
                    adminMessage = `Order ${data.orderId} updated in store ${data.storeId}`;
                    break;

                case 'order-cancelled':
                    storeMessage = `Order ${data.orderId} was cancelled`;
                    adminMessage = `Order ${data.orderId} cancelled for store ${data.storeId}`;
                    break;

                case 'Order-delete':
                    storeMessage = `Order ${data.orderId} was deleted`;
                    adminMessage = `Order ${data.orderId} deleted for store ${data.storeId}`;
                    break;

                case 'user-registered':
                    userMessage = `Welcome ${data.metadata?.fullName}, your account has been created successfully!`;
                    adminMessage = `New user registered: ${data.metadata?.fullName}`;
                    break;

                case 'user-login':
                    userMessage = `Welcome back! You have successfully logged in.`;
                    break;

                case 'user-logout':
                    userMessage = `${data.metadata.email} is logout`
                    break;

                case 'User-Update-Profile':
                    userMessage = `Your profile has been updated successfully.`;
                    break;

                case 'User-Forgot-password':
                    userMessage = `A password reset link has been sent to your email.`;
                    break;

                case 'User-Reset-password':
                    userMessage = `Your password has been reset successfully.`;
                    break;

                case 'Delete-User':
                    adminMessage = `User ${data.userId} has been deleted.`;
                    break;

                case 'Create-Store':
                    storeMessage = `Store ${data.storeId} has been created successfully.`;
                    adminMessage = `Store ${data.storeId} has been created successfully.`;
                    break;
                case 'Login-Store':
                    adminMessage = `Store ${data.storeId} has been logged in successfully.`;
                    storeMessage = `Store ${data.storeId} has been logged in successfully.`;
                    break;

                case 'Store-Forgot-Password':
                    storeMessage = `A password reset link has been sent to your email.`;
                    break

                case 'Store-Reset-Password':
                    storeMessage = `Your password has been reset successfully.`;
                    break

                case 'Delete-Store':
                    adminMessage = `Store Onwer ${data.storeId} has been deleted`
                    break
                case 'Update-Store':
                    adminMessage = `Store ${data.storeId} has been updated successfully.`
                    break

                case 'Reject-Store':
                    adminMessage = `Store ${data.storeId} has been rejected.`
                    break
                case 'Approve-Store':
                    adminMessage = `Store ${data.storeId} has been approved.`
                    break
                case 'SubScription-Created':
                    adminMessage = `Subscription ${data.subScriptionId} has been created successfully.`
                    break
                case 'SubScription-Deleted':
                    adminMessage = `Subscription ${data.subScriptionId} has been deleted successfully.`
                    break

                case 'User-Purchase-SubScription':
                    userMessage = `You have successfully purchased Subscription ${data.subScriptionId}.`
                    adminMessage = `${data.subScriptionId} Subscription purchase ${data.userId}`
                    break
                case 'User-Cancel-SubScription':
                    userMessage = `You have successfully cancelled Subscription ${data.subScriptionId}.`
                    adminMessage = `${data.subScriptionId} Subscription cancel ${data.userId}`
                    break
                default:
                    storeMessage = `Notification: ${data.type}`;
                    adminMessage = `Admin Notification: ${data.type}`;
                    userMessage = `Notification: ${data.type}`;
                    break;
            }

            const notification = await NotificationModel.create({
                modelName: data.modelName,
                message: storeMessage,
                type: data.type,
                createdBy: data.createdBy,
                userId: data.userId,
                storeId: data.storeId,
                orderId: data.orderId,
                subScriptionId: data.subScriptionId,
                usersubScriptionId: data.usersubScriptionId,
                isRead: false,
                metadata: data.metadata || {},
            });


            const io = this.getIO();
            if (data.modelName === 'Order') {
                io.to(`store_${data.storeId}`).emit(data.type, {
                    modelName: data.modelName,
                    orderId: data.orderId,
                    message: storeMessage,
                    type: data.type,
                    createdBy: data.createdBy,
                    storeId: data.storeId,
                    userId: data.userId
                });

                console.log(`Notification sent to store ${data.storeId}`);
                io.to('admin-room').emit('notification', {

                    modelName: data.modelName,
                    orderId: data.orderId,
                    message: adminMessage,
                    type: data.type,
                    createdBy: data.createdBy,
                    storeId: data.storeId,
                    userId: data.userId

                });
                console.log('Notification sent to admin-room');

            }
            else if (data.modelName === 'User') {
                io.to(`admin-room`).emit("notification", {

                    modelName: data.modelName,
                    userId: data.userId,
                    message: userMessage,
                    type: data.type,
                    createdBy: data.createdBy,
                })
                io.to("admin-room").emit("notification", { message: "Test notification" });

                console.log(`📢 Notification sent to user ${data.userId}`);

            } else if (data.modelName === 'Store') {

                io.to(`admin-room`).emit("notification", {
                    modelName: data.modelName,
                    storeId: data.storeId,
                    message: storeMessage || adminMessage,
                    type: data.type,
                    createdBy: data.createdBy,
                });

            } else if (data.modelName === 'Subscription') {
                io.to(`admin-room`).emit("notification", {
                    modelName: data.modelName,
                    message: adminMessage,
                    type: data.type,
                    createdBy: data.createdBy,
                    subScriptionId: data.subScriptionId
                })
            } else if (data.modelName === 'UserSubscription') {
                io.to(`admin-room`).emit("notification", {
                    modelName: data.modelName,
                    userId: data.userId,
                    message: adminMessage,
                    type: data.type,
                    subScriptionId: data.subScriptionId,
                    usersubScriptionId: data.usersubScriptionId
                })
                io.to(`user_${data.userId}`).emit(data.type, {
                    message: userMessage,
                    userId: data.userId,
                    type: data.type,
                    createdBy: data.createdBy,
                    subScriptionId: data.subScriptionId,
                    usersubScriptionId: data.usersubScriptionId
                })
            }


            return notification;
        } catch (error) {
            Logger.error('Error sending notification:', error);
            throw new Error('Error sending notification');
        }
    }


    // modelName: 'Order',
    // orderId: order._id,
    // message: `New order received from ${user.fullName} for store ${store.storeName}`,
    // type: 'new-order',
    // createdBy: 'User',
    // userId: order.userId,
    // storeId: order.storeId

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
            console.log(`Notification saved to database: ${message} `);

            return notificationData;
        } catch (error) {
            console.error('Failed to save notification:', error);
        }
    }


    // public async createNotification(data: any) {
    //     try {
    //         console.log('\n=== Creating Notification ===');
    //         console.log('User ID:', data.userId);
    //         console.log('Type:', data.type);
    //         console.log('Message:', data.message);
    //         const notification = await NotificationModel.create(data);
    //         const room = data.modelName === 'Store' ? `store_${ data.storeId } ` : `user_${ data.userId } `;
    //         const io = this.getIO()
    //         io.to(room).emit('notification', notification);
    //         console.log("room", room)
    //         if (data.modelName === 'User') {
    //             this.io.to(data.userId.toString()).emit('notification', notification);
    //         } else if (data.modelName === 'Store') {
    //             this.io.to(data.storeId.toString()).emit('notification', notification);
    //         }

    //         return notification;
    //     } catch (error) {
    //         Logger.error('Error creating notification:', error);
    //         throw new Error('Error creating notification');
    //     }
    // }

    /**
     * Fetch all notifications for a user or store
     * @param modelName - 'User' or 'Store'
     * @param id - userId or storeId
     */
    public async getNotifications(modelName: string, id: string) {
        try {
            const notifications = await NotificationModel.find({
                modelName,
                [`${modelName.toLowerCase()} Id`]: id,
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

