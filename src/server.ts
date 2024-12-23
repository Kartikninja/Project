<<<<<<< HEAD
import { App } from "@/app";
import { AuthRoute } from "@routes/auth.route";
import { ValidateEnv } from "@utils/validateEnv";
import { UserRoute } from "./routes/user.route";

ValidateEnv();

const app = new App([
  new AuthRoute(),
  new UserRoute(),
]);
=======
import { App } from '@/app';
import { AuthRoute } from '@routes/auth.route';
import { UserRoute } from './routes/user.route';
import { ReferenceAppRoute } from './routes/referenceapp.route';
import { IndustryRouter } from './routes/industry.routes';
import { FeatureAndBenefitsRoute } from './routes/featureandbenefit.route';


const app = new App([new AuthRoute(), new UserRoute(), new ReferenceAppRoute,new IndustryRouter(), new FeatureAndBenefitsRoute()]);
>>>>>>> d67e7de05d0dee87828d161ef3b32297ee0574d8

app.listen();
