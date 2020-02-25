import Koa from 'koa';
import getBaseRouter from './api/router.js';

const server = async (port) => {
    const app = new Koa();
    const router = await getBaseRouter();
    app.use(router.routes());
    app.use(async (ctx) => {
        ctx.body = 'Hello World';
    });

    console.log(`port: ${port}`);
    app.listen(port);
};

export default server;
