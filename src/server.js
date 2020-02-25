import Koa from "koa";
import getApiRouter from "./api/router.js";

const server = async() => {
    const app = new Koa();
    const router = await getApiRouter();
    app.use(router.routes());
    app.use(async ctx => {
        ctx.body = 'Hello World';
    });
    app.listen(8080);
};

export default server;
