import { Socket, Server } from 'socket.io';
import { NotificationService } from '../../services/Notification.service';

const notification = new NotificationService();

export const socketController = (socket: Socket, io: Server) => {
 

  console.log('Admin socket connected:', socket.id);

  socket.on("join-room", (roomName: string) => {
    socket.join(roomName);
    console.log("roomName", roomName)


    console.log("Admin joined the admin-room.");
  });

  socket.on("join-admin-room", () => {
    const room = "order-admin-room";
    socket.join(room);
    console.log("socketController->Admin joined order-admin-room");
  });

  socket.on("join-user-room", (userId: string) => {
    const room = `user_${userId}`;
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on("join-store-room", (storeId: string) => {
    const room = `store_${storeId}`;
    socket.join(room);
    console.log(`socketController->Store joined room: ${room}`);
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

