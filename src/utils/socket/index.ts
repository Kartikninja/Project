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

