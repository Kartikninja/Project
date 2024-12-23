import { App } from '@/app';
import { AuthRoute } from '@routes/auth.route';
import { UserRoute } from './routes/user.route';



const app = new App([new AuthRoute(), new UserRoute()]);

app.listen();
