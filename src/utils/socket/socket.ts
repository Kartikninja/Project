import { Server, Socket } from 'socket.io';
import Container from 'typedi';

export function initializeSocket(httpServer: any) {
    const io = new Server(httpServer, {
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
        socket.on("join-admin-room", () => {
            socket.join('admin_room');
            console.log('Admin joined admin_room');
        });

        socket.on('joiin-store-room', (storeId: string) => {
            socket.join(`store_${storeId}`)
            console.log(`Store with ID ${storeId} joined room store_${storeId}`);

        })

        socket.on("new-user-signup", (data) => {
            try {
                console.log("New user signup data:", data);
            } catch (error) {
                console.error("Error in 'new-user-signup' event:", error);
            }
        });

        socket.on("disconnect", () => {
            console.log("A user disconnected");
        });

    });
    Container.set('io', io);

    return io;
}
