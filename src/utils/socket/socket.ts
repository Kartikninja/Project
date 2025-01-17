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
        allowEIO3: true,


    });
    console.log('Connected Socket')
    io.on("connection", (socket) => {
        console.log("a user connected");

        socketController(socket, io);

    });
    Container.set('io', io);

    return io;
}
