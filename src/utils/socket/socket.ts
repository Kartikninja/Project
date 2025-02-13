import { Server, Socket } from 'socket.io';
import Container from 'typedi';
import { socketController } from '.';
import { instrument } from "@socket.io/admin-ui";


export function initializeSocket(httpServer: any) {
    const io = new Server(httpServer, {
        path: '/socket.io/',
        cors: {
            origin: ["http://localhost:5173"],
            methods: ['GET', 'POST'],
            credentials: true,
            allowedHeaders: ['Content-Type'],

        },
        transports: ['polling', 'websocket'],
        allowEIO3: true,


    });
    instrument(io, {
        auth: false,
        mode: 'development'
    });
    console.log('Connected Socket')
    io.on("connect", (socket) => {
        console.log("a user connected");

        socketController(socket, io);

    });
    Container.set('io', io);

    return io;
}
