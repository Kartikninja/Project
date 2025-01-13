import { Server, Socket } from 'socket.io';
import Container from 'typedi';
import { socketController } from '.';


export function initializeSocket(httpServer: any) {
    const io = new Server(httpServer, {
        path: '/socket.io/',
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true,
            allowedHeaders: ['Content-Type'],
        },
        transports: ['polling', 'websocket'],

    });
    console.log('Connected Socket')
    io.on("connection", (socket) => {
        console.log("a user connected");

        socketController(socket, io);

    });
    Container.set('io', io);

    return io;
}


// socket.on("new-store-sigup", (data) => {
//     socket.join('admin-store-room');
//     console.log('Admin joined admin_room', data);
// });

// socket.on('join-store-room', (storeId: string) => {
//     socket.join(`store_${storeId}`)
//     console.log(`Store with ID ${storeId} joined room store_${storeId}`);

// })

// socket.on('join-subscription', (subscriptionId: string) => {
//     socket.join(`subScription_${subscriptionId}`)
//     console.log(`User joined room subScription_${subscriptionId}`);

// })

// socket.on("new-user-signup", (data) => {
//     try {
//         socket.join('admin-room')
//         console.log("New user signup data:", data);
//     } catch (error) {
//         console.error("Error in 'new-user-signup' event:", error);
//     }
// });

// socket.on("disconnect", () => {
//     console.log("A user disconnected");
// });