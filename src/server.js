import Koa from 'koa';
import getBaseRouter from './api/router.js';
import {createConfig} from './util/index.js';
import {createDb} from './database/index.js';
import {create as createDsetstore,
        get as getDsetstore} from './context/dsetstore.js';

const server = async () => {
    const app = new Koa();
    const router = await getBaseRouter();
    const config = await createConfig();
    const {port, datasetpath} = config.server;
    console.log(`port: ${port}`);

    await createDsetstore(datasetpath);
    app.context.dsetstore = getDsetstore();
    await createDb();

    app.use(router.routes());
    app.use(async (ctx) => {
        ctx.body = 'This is datatomb speaking. Refer to https://gitlab.spang-lab.de/containers/datatomb/blob/master/README.md for API documentation';
    });


    app.listen(port);
};

export default server;
