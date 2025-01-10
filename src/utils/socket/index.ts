import { Socket, Server } from 'socket.io';
import { NotificationService } from '../../services/Notification.service';

const notification = new NotificationService()

export const socketController = (socket: Socket, io: Server) => {

  console.log('Admin socket connected:', socket.id);

  const userId = socket.handshake.query?.userId
  const storeId = socket.handshake.query?.storeId

  console.log(`UserId:${userId} and this is StoreId : ${storeId}`)
  if (userId) {
    socket.join(`user_${userId}`)
    console.log(`User joined room: user_${userId}`);

  }

  if (storeId) {
    socket.join(`store_${storeId}`)
    console.log(`Store joined room: store_${storeId}`);
  }

  socket.join('admin_room');
  console.log('Admin joined room: admin_room');

  socket.on('getNotification', async function (data) {
    console.log('getNotification');
    socket.emit('admin-notification', {
      message: 'New notification from the server',
      data: data,
    });
  });
  socket.on('new-user-signup', (userData) => {
    try {
      console.log('New user signup:', userData);
      io.to('admin_room').emit('admin-notification', {
        message: `New user signed up: ${userData.fullName}`,
        user: userData,
      });
    } catch (err) {
      console.error('Error emitting notification:', err);
    }
  });


  socket.on('send-notification', async (notificationData) => {
    try {
      console.log('send-notification', notificationData)
      const notificationResponse = await notification.sendAdminNotification(
        notificationData.modelName,
        notificationData.id,
        notificationData.message,
        notificationData.type,
        notificationData.createdBy
      );
      const room = notificationData.userId
        ? `user_${notificationData.userId}`
        : notificationData.storeId
          ? `store_${notificationData.storeId}`
          : 'admin_room';


      io.to(room).emit('notification', notificationData);
      console.log(`Notification sent to room: ${room}`);
    } catch (error) {
      console.error('Error sending notification:', error);

    }
  })



  socket.on('disconnect', () => {
    console.log('Admin socket disconnected:', socket.id);
  });

};
