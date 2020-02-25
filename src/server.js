import Koa from 'koa';
import getBaseRouter from './api/router.js';
import {createConfig} from './util/index.js';
import {createDb} from './database/index.js';

const server = async () => {
    const app = new Koa();
    const router = await getBaseRouter();
    const config = await createConfig();
        const {port} = config.server;
    console.log(`port: ${port}`);

    await createDb();

    app.use(router.routes());
    app.use(async (ctx) => {
        ctx.body = 'Hello World';
    });


    app.listen(port);
};

export default server;
