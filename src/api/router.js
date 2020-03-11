import Router from 'koa-router';
import { search } from './search.js';
import { getMetadata, rmMetadata } from './metadata.js';
import { uploadDataset, getDataset, rmDataset, getLog } from './dataset.js';
import { log } from '../util/index.js';
import { apiTransaction,
         apiError,
       } from '../middleware/index.js';
import {get as getDsetstore} from '../context/dsetstore.js';
import multer from 'koa-multer';

const getApiRouter = async () => {
    const apirouter = new Router();

    const dsetstore = await getDsetstore();
    let storage = multer.diskStorage({
        destination: function (req, file, cb) {
            // log(`dest: ${dsetstore}`);
            cb(null, './');
        },
        filename: function (req, file, cb) {
            console.log(`file: ${file}`);
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix);
        }
    });
    const upload = multer({
        storage: storage
    });
    // const upload = multer({dest: './'});
    apirouter.use(apiError);
    apirouter.use(apiTransaction);
    apirouter.get("/meta/search", (ctx) => { search(ctx); });
    apirouter.get("/meta/:hash", (ctx) => { getMetadata(ctx); });
    apirouter.del("/meta/:hash", (ctx) => { rmMetadata(ctx); });
    apirouter.post("/upload", upload.single('file'), (ctx) => { uploadDataset(ctx); });
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
