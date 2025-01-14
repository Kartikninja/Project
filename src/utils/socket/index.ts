import { Socket, Server } from 'socket.io';
import { NotificationService } from '../../services/Notification.service';

const notification = new NotificationService();

export const socketController = (socket: Socket, io: Server) => {
  console.log('Admin socket connected:', socket.id);

  const userId = socket.handshake.query?.userId;
  const storeId = socket.handshake.query?.storeId;


  if (userId) {
    socket.join(`user_${userId}`);
    console.log(`User joined room: user_${userId}`);
  }

  if (storeId) {
    socket.join(`store_${storeId}`);
    console.log(`Store joined room: store_${storeId}`);
  }

  socket.join('admin_room');
  console.log('Admin joined room: admin_room');

  socket.on("new-store-signup", (data) => {
    socket.join('admin-store-room');
    console.log('Admin joined admin_store_room', data);
  });

  socket.on('join-store-room', (storeId: string) => {
    socket.join(`store_${storeId}`);
    console.log(`Store with ID ${storeId} joined room store_${storeId}`);
  });

  socket.on('join-subscription', (subscriptionId: string) => {
    socket.join(`subScription_${subscriptionId}`);
    console.log(`User joined room subScription_${subscriptionId}`);
  });

  socket.on("new-user-signup", (userData) => {
    try {
      socket.join('admin-room');
      console.log("New user signup data:", userData);

      io.to('admin-room').emit('kk', {
        message: `New user signed up: ${userData.fullName}`,
        user: userData,
      });
    } catch (error) {
      console.error("Error in 'new-user-signup' event:", error);
    }
  });

  socket.on("userLoggedIn", (data) => {
    try {
      console.log("User logged in:", data);

      socket.join('admin-room');

      io.to('admin-room').emit('notification', {
        message: data.message,
        userId: data.userId,
        type: data.type,
      });

    } catch (error) {
      console.error("Error in 'userLoggedIn' event:", error);
    }
  });


  socket.on("userLoggedOut", (data) => {
    try {
      console.log("User userLoggedOut:", data);

      socket.join('admin-room');

      io.to('admin-room').emit('notification', {
        message: data.message,
        userId: data.userId,
        type: data.type,
      });

    } catch (error) {
      console.error("Error in 'userLoggedOut' event:", error);
    }
  });


  socket.on("passwordFogotRequested", (data) => {
    try {
      console.log("User passwordFogotRequested:", data);

      socket.join('admin-room');

      io.to('admin-room').emit('notification', {
        message: data.message,
        userId: data.userId,
        type: data.type,
      });

    } catch (error) {
      console.error("Error in 'passwordFogotRequested' event:", error);
    }
  });



  socket.on("passwordResetRequested", (data) => {
    try {
      console.log("User passwordResetRequested:", data);

      socket.join('admin-room');

      io.to('admin-room').emit('notification', {
        message: data.message,
        userId: data.userId,
        type: data.type,
      });

    } catch (error) {
      console.error("Error in 'passwordResetRequested' event:", error);
    }
  });


  socket.on("deleteUser", (data) => {
    try {
      console.log("User deleteUser:", data);

      socket.join('admin-room');

      io.to('admin-room').emit('notification', {
        message: data.message,
        userId: data.userId,
        type: data.type,
      });

    } catch (error) {
      console.error("Error in 'deleteUser' event:", error);
    }
  });

  socket.on("updateProfile", (data) => {
    try {
      console.log("User updateProfile:", data);

      socket.join('admin-room');

      io.to('admin-room').emit('notification', {
        message: data.message,
        userId: data.userId,
        type: data.type,
      });

    } catch (error) {
      console.error("Error in 'updateProfile' event:", error);
    }
  });

  socket.on('getNotification', async function (data) {
    console.log('getNotification');
    socket.emit('admin-notification', {
      message: 'New notification from the server',
      data: data,
    });
  });

  socket.on('disconnect', () => {
    console.log('Admin socket disconnected:', socket.id);
  });
};




// socket.on('send-notification', async (notificationData) => {
//   try {
//     console.log('send-notification', notificationData);
//     const notificationResponse = await notification.sendAdminNotification(
//       notificationData.modelName,
//       notificationData.id,
//       notificationData.message,
//       notificationData.type,
//       notificationData.createdBy
//     );
//     const room = notificationData.userId
//       ? `user_${notificationData.userId}`
//       : notificationData.storeId
//         ? `store_${notificationData.storeId}`
//         : 'admin_room';

//     io.to(room).emit('notification', notificationData);
//     console.log(`Notification sent to room: ${room}`);
//   } catch (error) {
//     console.error('Error sending notification:', error);
//   }
// });
