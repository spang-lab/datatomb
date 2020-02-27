import Router from 'koa-router';
import { search } from './search.js';
import { putMetadata, getMetadata, rmMetadata } from './metadata.js';
import { putDataset, getDataset, rmDataset, getLog } from './dataset.js';
import { log } from '../util/index.js';
import { apiTransaction,
         apiError,
       } from '../middleware/index.js';

const getApiRouter = async () => {
    const apirouter = new Router();
    apirouter.use(apiError);
    //apirouter.use(apiTransaction);
    apirouter.get("/meta/search", (ctx) => { search(ctx); });
    apirouter.put("/meta/:hash", (ctx) => { putMetadata(ctx); });
    apirouter.get("/meta/:hash", (ctx) => { getMetadata(ctx); });
    apirouter.del("/meta/:hash", (ctx) => { rmMetadata(ctx); });
    apirouter.put("/:hash", (ctx) => { putDataset(ctx); });
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
