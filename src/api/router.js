import Router from 'koa-router';
import { search } from './search.js';
import { get as getMetadata,
         rm as rmMetadata } from './metadata.js';
import { uploadDataset, getDataset, rmDataset, getLog } from './dataset.js';
import { log } from '../util/index.js';
import { apiTransaction,
         apiError,
       } from '../middleware/index.js';
import {get as getDsetstore} from '../context/dsetstore.js';

const getApiRouter = async () => {
    const apirouter = new Router();
    apirouter.use(apiError);
    apirouter.use(apiTransaction);
    apirouter.get("/meta/search", (ctx) => { search(ctx); });
    apirouter.get("/meta/:hash", (ctx) => { getMetadata(ctx); });
    apirouter.del("/meta/:hash", (ctx) => { rmMetadata(ctx); });
    apirouter.post("/upload", (ctx) => { uploadDataset(ctx); });
    apirouter.get("/:hash", (ctx) => { getDataset(ctx); });
    apirouter.del("/:hash", (ctx) => { rmDataset(ctx); });
    apirouter.get("/log/:hash", (ctx) => { getLog(ctx); });
    apirouter.get("/healthy", (ctx) => { ctx.body = '1'; });
    return apirouter;
};

const getBaseRouter = async() => {
    const baserouter = new Router();
    const apirouter = await getApiRouter();
    baserouter.use("/api/v1", apirouter.routes(), apirouter.allowedMethods());
    return baserouter;
};

export default getBaseRouter;
