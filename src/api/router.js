import Router from "koa-router";

const getApiRouter = async () => {
    const apirouter = new Router();
    apirouter.get("/healthy", (ctx) => { ctx.body = "1"; });
    return apirouter;
};

export default getApiRouter;
