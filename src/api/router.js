import Router from 'koa-router';
import { search } from './search.js';
import { get as getMetadata } from './metadata.js';
import { uploadDataset, getDataset, rmDataset, getLog } from './dataset.js';
import { log } from '../util/index.js';
import { apiTransaction,
         apiError,
         apiAuth,
         isUser,
         isOwnerOrAdmin,
         mayRead
       } from '../middleware/index.js';
import {get as getDsetstore} from '../context/dsetstore.js';

const getApiRouter = async () => {
    const apirouter = new Router();
    apirouter.use(apiError);
    apirouter.use(apiTransaction);
    apirouter.use(apiAuth);
    apirouter.get("/meta/search", isUser, async (ctx) => { await search(ctx); });
    apirouter.get("/meta/:hash", mayRead, async (ctx) => { await getMetadata(ctx); });
    apirouter.get("/healthy", (ctx) => { ctx.body = JSON.stringify({ok: true}); });
    apirouter.post("/upload", isUser, async (ctx) => { await uploadDataset(ctx);});
    apirouter.get("/log/:hash", isOwnerOrAdmin, async (ctx) => { await getLog(ctx); });
    apirouter.get("/:hash", mayRead, async (ctx) => { await getDataset(ctx); });
    apirouter.del("/:hash", isOwnerOrAdmin, async (ctx) => { await rmDataset(ctx); });
    return apirouter;
};

const getBaseRouter = async() => {
    const baserouter = new Router();
    const apirouter = await getApiRouter();
    baserouter.use("/api/v1", apirouter.routes(), apirouter.allowedMethods());
    return baserouter;
};

export default getBaseRouter;
