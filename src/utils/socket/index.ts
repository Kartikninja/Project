import { Socket, Server } from 'socket.io';
import { NotificationService } from '../../services/Notification.service';

const notification = new NotificationService();

export const socketController = (socket: Socket, io: Server) => {
  console.log('Admin socket connected:', socket.id);

  socket.on("join-room", (roomName: string) => {
    socket.join(roomName);
    console.log("roomName", roomName)

    // notification.sendAdminNotification('Room', `Admin joined the ${roomName}`, 'room-joined', 'Admin', socket.id);

    console.log("Admin joined the admin-room.");
  });


  socket.on("join-user-room", (userId: string) => {
    const room = `user_${userId}`;
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on("join-store-room", (storeId: string) => {
    const room = `store_${storeId}`;
    socket.join(room);
    console.log(`Store joined room: ${room}`);
  });

  socket.on('join-subscription-room', (subScriptionId: string) => {
    const room = `subScription_${subScriptionId}`;
    socket.join(room);
    console.log(`Subscription joined room: ${room}`);
  })


  socket.on('disconnect', () => {
    console.log('Admin socket disconnected:', socket.id);
  });
};

// socket.on('Create-Order', async (notificationData) => {
//   const { userId, storeId, message } = notificationData;
//   const room = userId
//     ? `user_${userId}`
//     : storeId
//       ? `store_${storeId}`
//       : 'admin-room';
//   console.log('Order Creating Notification sent to :', room)
//   io.to(room).emit('notification', notificationData);
//   console.log(`Notification sent to room: ${room}`);
// });


// socket.on('notification', async (notificationData) => {
//   try {
//     console.log('send-notification', notificationData);
//     const notificationResponse = await notification.sendAdminNotification(
//       notificationData.modelName,
//       notificationData.id,
//       notificationData.message,
//       notificationData.type,
//       notificationData.createdBy
//     );






//     if (notificationData.roomName) {
//       io.to(notificationData.roomName).emit('notification', notificationData);
//       console.log(`Notification sent to room: ${notificationData.roomName}`);
//     } else {
//       io.to('admin-room').emit('notification', notificationData);
//       console.log('Notification sent to admin-room');
//     }
//     return notificationResponse;
//   } catch (error) {
//     console.error('Error sending notification:', error);
//     return { success: false, error: error.message };
//   }
// });






// socket.on("new-store-signup", (data) => {
//   socket.join('admin-store-room');
//   console.log('Admin joined admin_store_room', data);
// });

// socket.on('join-store-room', (storeId: string) => {
//   socket.join(`store_${storeId}`);
//   console.log(`Store with ID ${storeId} joined room store_${storeId}`);
// });

// socket.on('join-subscription', (subscriptionId: string) => {
//   socket.join(`subScription_${subscriptionId}`);
//   console.log(`User joined room subScription_${subscriptionId}`);
// });





// socket.on('getNotification', async function (data) {
//   console.log('getNotification');
//   socket.emit('admin-notification', {
//     message: 'New notification from the server',
//     data: data,
//   });
// });




// const userId = socket.handshake.query?.userId;
// const storeId = socket.handshake.query?.storeId;


// if (userId) {
//   socket.join(`user_${userId}`);
//   console.log(`User joined room: user_${userId}`);
// }

// if (storeId) {
//   socket.join(`store_${storeId}`);
//   console.log(`Store joined room: store_${storeId}`);
// }

// socket.join('admin-room');
// console.log('Admin joined room: admin_room');





// socket.on("new-user-signup", (userData) => {
//   try {
//     socket.join('admin-room');
//     console.log("New user signup data:", userData);

//     io.to('admin-room').emit('kk', {
//       message: `New user signed up: ${userData.fullName}`,
//       user: userData,
//     });
//   } catch (error) {
//     console.error("Error in 'new-user-signup' event:", error);
//   }
// });



// socket.on("userLoggedIn", (data) => {
//   try {
//     console.log("User logged in:", data);

//     socket.join('admin-room');

//     io.to('admin-room').emit('notification', {
//       message: data.message,
//       userId: data.userId,
//       type: data.type,
//     });

//   } catch (error) {
//     console.error("Error in 'userLoggedIn' event:", error);
//   }
// });


// socket.on("userLoggedOut", (data) => {
//   try {
//     console.log("User userLoggedOut:", data);

//     socket.join('admin-room');

//     io.to('admin-room').emit('notification', {
//       message: data.message,
//       userId: data.userId,
//       type: data.type,
//     });

//   } catch (error) {
//     console.error("Error in 'userLoggedOut' event:", error);
//   }
// });


// socket.on("passwordFogotRequested", (data) => {
//   try {
//     console.log("User passwordFogotRequested:", data);

//     socket.join('admin-room');

//     io.to('admin-room').emit('notification', {
//       message: data.message,
//       userId: data.userId,
//       type: data.type,
//     });

//   } catch (error) {
//     console.error("Error in 'passwordFogotRequested' event:", error);
//   }
// });



// socket.on("passwordResetRequested", (data) => {
//   try {
//     console.log("User passwordResetRequested:", data);

//     socket.join('admin-room');

//     io.to('admin-room').emit('notification', {
//       message: data.message,
//       userId: data.userId,
//       type: data.type,
//     });

//   } catch (error) {
//     console.error("Error in 'passwordResetRequested' event:", error);
//   }
// });


// socket.on("deleteUser", (data) => {
//   try {
//     console.log("User deleteUser:", data);

//     socket.join('admin-room');

//     io.to('admin-room').emit('notification', {
//       message: data.message,
//       userId: data.userId,
//       type: data.type,
//     });

//   } catch (error) {
//     console.error("Error in 'deleteUser' event:", error);
//   }
// });

// socket.on("updateProfile", (data) => {
//   try {
//     console.log("User updateProfile:", data);

//     socket.join('admin-room');

//     io.to('admin-room').emit('notification', {
//       message: data.message,
//       userId: data.userId,
//       type: data.type,
//     });

//   } catch (error) {
//     console.error("Error in 'updateProfile' event:", error);
//   }
// });
