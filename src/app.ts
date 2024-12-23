<<<<<<< HEAD
import "reflect-metadata";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import { connect, set } from "mongoose";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { NODE_ENV, PORT, LOG_FORMAT } from "@config";
import { dbConnection } from "@database";
import { Routes } from "@interfaces/routes.interface";
import { ErrorMiddleware } from "@middlewares/error.middleware";
import { logger, stream } from "@utils/logger";
import { readFileSync } from 'fs';
import * as path from 'path';
import { createServer } from "https";
export class App {
=======
import 'reflect-metadata';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { connect, set } from 'mongoose';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { NODE_ENV, PORT, LOG_FORMAT } from '@config';
import { dbConnection } from '@database';
import { Routes } from '@interfaces/routes.interface';
import { createServer } from 'https';
import { Logger } from './utils/logger';
import { ErrorMiddleware } from './middlewares/error.middleware';


export class App {
  // private initializeErrorHandling() {
  //   this.app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  //     console.error(`Unhandled Rejection at: ${req.url}, ${err}`);
  //     console.error(err instanceof Error ? err.stack : String(err));
  //     res.status(500).json({
  //       error: 'Internal Server Error',
  //       message: err instanceof Error ? err.message : String(err),
  //     });
  //   });
  // }
>>>>>>> d67e7de05d0dee87828d161ef3b32297ee0574d8
  public app: express.Application;
  public env: string;
  public port: string | number;
  public server: any;
  public io: any;
  public http: any;
  public httpServer: any;


  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV || "development";
    this.port = PORT || 5000;
    this.app.set('port', this.port);

    this.httpServer = createServer({
      // key: readFileSync(path.join(__dirname, "ssl/privkey.pem")),
      // cert: readFileSync(path.join(__dirname, "ssl/cert.pem")),
      // ca: readFileSync(path.join(__dirname, "ssl/chain.pem"))
    }, this.app);

    this.http = require('http').Server(this.app);
<<<<<<< HEAD

=======
    this.app.use(helmet());
>>>>>>> d67e7de05d0dee87828d161ef3b32297ee0574d8
    this.connectToDatabase();
    this.initializeSwagger();
    this.initializeMiddlewares();
    this.initializeRoutes(routes);
<<<<<<< HEAD
    this.initializeErrorHandling();
    this.app.use(helmet());
=======
    this.initializeSwagger();
    this.initializeErrorHandling();

>>>>>>> d67e7de05d0dee87828d161ef3b32297ee0574d8
  }

  public async listen() {
    const server = this.http.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    })
<<<<<<< HEAD
=======

>>>>>>> d67e7de05d0dee87828d161ef3b32297ee0574d8
  }

  public getServer() {
    return this.app;
  }

  private async connectToDatabase() {
    console.log(">>>>> Environment:", this.env);

    if (this.env !== "production") {
      set("debug", true);
    }

    try {
      await connect(dbConnection.url);
      console.log("Database connection successful!");
    } catch (error) {
      console.error("Database connection error:", error);
      throw error;
    }
  }


  private initializeMiddlewares() {
<<<<<<< HEAD
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(cors({ origin: "*", credentials: false }));
=======
    // this.app.use(morgan(LOG_FORMAT));
    this.app.use(cors({ origin: '*', credentials: false }));
>>>>>>> d67e7de05d0dee87828d161ef3b32297ee0574d8
    this.app.use(hpp());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
    this.app.disable('x-powered-by');

  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach((route) => {
      this.app.use("/api/v1", route.router);
    });

    this.app.get('/ping', (_req, res) => {
      return res.status(200).send('pong');
    });
    this.app.use('*', this.routHandler);
  }

  private initializeSwagger() {
    const options = {
      swaggerDefinition: {
        info: {
          title: "REST API",
          version: "1.0.0",
          description: "Example docs",
        },
      },
      apis: ["swagger.yaml"],
    };

    const specs = swaggerJSDoc(options);
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
    this.app.get("/ping", (req, res) => {
      return res.status(200).send('pong');
    });
  }

  private initializeErrorHandling() {
    this.app.use(ErrorMiddleware);
  }
<<<<<<< HEAD
=======

  private routHandler(_req: Request, res: Response) {
    res.status(404).json({ message: 'Route not found' });
  }

>>>>>>> d67e7de05d0dee87828d161ef3b32297ee0574d8
}

// const io = require('socket.io')(this.http,{
//   cors: { origin: '*' }
// });

//   io.on('connect', (socket) => {
//     socketController(socket)
//     this.app.set('socketio', socket);
// })