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
import { NODE_ENV, PORT, LOG_FORMAT, REDIS_HOST, REDIS_PORT } from '@config';
import { dbConnection } from '@database';
import { Routes } from '@interfaces/routes.interface';
import { createServer } from 'https';
import { Logger } from './utils/logger';
import { ErrorMiddleware } from './middlewares/error.middleware';
import Redis, { Redis as RedisClient } from 'ioredis'
import { cron1 } from './utils/corn/node-corn';


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
  public app: express.Application;
  public env: string;
  public port: string | number;
  public server: any;
  public io: any;
  public http: any;
  public httpServer: any;
  private redisClient: RedisClient | null = null;


  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3020;
    this.app.set('port', this.port);
    this.httpServer = createServer(this.app);
    this.http = require('http').Server(this.app);
    this.app.use(helmet());
    this.connectToDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeSwagger();
    this.initializeErrorHandling();

    this.initializeRedis()
    this.initializeCron()

  }

  public async listen() {
    await new Promise((resolve, reject) => {
      this.http.listen(this.port, () => {
        console.log(`==========================================`);
        console.log(`========== ENV: ${this.env} ==============`);
        Logger.info(`=== 🚀 App listening on the port ${this.port} ===`);
        console.log(`==========================================`);
        resolve(true);
      }).on('error', (error) => {
        Logger.error('Port is already in use!', error);
        reject(error);
      });
    })

  }
  private async initializeCron() {
    console.log("Cron job initialized");

    await cron1
  }




  // await this.redisClient.hgetall('user:active')
  // await this.redisClient.hgetall('user:inactive')
  // await this.redisClient.hgetall('user:all')
  // await this.redisClient.hgetall('user:active:count')
  // await this.redisClient.hgetall('user:inactive:count')
  // await this.redisClient.hgetall('user:all:count')
  // await this.redisClient.hgetall('user:active:count:today')
  // await this.redisClient.hgetall('user:inactive:count:today')
  // await this.redisClient.hgetall('user:all:count:today')
  // await this.redisClient.hgetall('user:active:count:week')
  // await this.redisClient.hgetall('user:inactive:count:week')
  // await this.redisClient.hgetall('user:all:count:week')
  // await this.redisClient.hgetall('user:active:count:month')
  // await this.redisClient.hgetall('user:inactive:count:month')

  // await this.redisClient.hgetall('user:all:count:month')
  private initializeRedis() {
    this.redisClient = new Redis({
      host: REDIS_HOST,
      port: Number(REDIS_PORT),

    })
    this.redisClient.on('connect', () => {
      Logger.info("Redis connected successfully")
    })
    this.redisClient.on('error', (err) => {
      Logger.error('Redis connection error:', err);

    })
  }

  public getServer() {
    return this.app;
  }

  private async connectToDatabase() {
    if (this.env !== 'production') set('debug', true);

    try {
      await connect(dbConnection.url);
      Logger.info('Database connection successfully!!!');
    } catch (error) {
      Logger.error(`Database connection ERROR`, error);
      throw error;
    }
  }

  private initializeMiddlewares() {
    // this.app.use(morgan(LOG_FORMAT));
    this.app.use(cors({ origin: '*', credentials: false }));
    this.app.use(hpp());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
    this.app.disable('x-powered-by');

  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use('/api/v1', route.router);
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
          title: 'REST API',
          version: '1.0.0',
          description: 'Example docs',
        },
      },
      apis: ['swagger.yaml'],
    };

    const specs = swaggerJSDoc(options);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    this.app.get('/ping', (req, res) => {
      return res.status(200).send('pong');
    });
  }

  private initializeErrorHandling() {
    this.app.use(ErrorMiddleware);
  }

  private routHandler(_req: Request, res: Response) {
    res.status(404).json({ message: 'Route not found' });
  }

}
