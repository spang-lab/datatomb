import Router from "koa-router";

const getApiRouter = async () => {
    const apirouter = new Router();
    apirouter.get("/healthy", (ctx) => { ctx.body = "1"; });
    apirouter.post("/meta/:hash", (ctx) => { console.log(`posting metadata for hash = ${ctx.params.hash}`); ctx.body = `${ctx.params.hash}`; });
    return apirouter;
};

const getBaseRouter = async() => {
    const baserouter = new Router();
    const apirouter = await getApiRouter();
    baserouter.use("/api/v1", apirouter.routes(), apirouter.allowedMethods());
    return baserouter;
};

export default getBaseRouter;
