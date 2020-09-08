import Koa from 'koa';
import getBaseRouter from './router.js';

const server = async () => {
    const app = new Koa();
    const router = await getBaseRouter();
    const port = 8082;

    app.use(router.routes());
    app.use(async (ctx) => {
        ctx.body = 'This is an unknown api path.',
        ctx.status = 404;
    });

    console.log(`listening on port: ${port}`);
    app.listen(port);
};

export default server;
