import Router from 'koa-router';
import koaBody from 'koa-body';
import fetch from 'node-fetch';
import atob from 'atob';

// generate "authtokens" by simply base64 encoding the returned json:
// e.g.:
//
// echo '{"sub": "jfalk", "groups": [{"name": "datatomb"}]}' | base64
//

const getAuthData = async(ctx) => {
    //let authtoken = ctx.headers.authorization;
    let authtoken = ctx.request.body.token;
    ctx.assert( authtoken, 400, "no authtoken given.");
    // simply returns the decoded version of the "authtoken":
    const response = JSON.stringify(JSON.parse(atob.atob(authtoken)));
    console.log(response);
    ctx.body = JSON.stringify(JSON.parse(atob.atob(authtoken)));
};

const getApiRouter = async () => {
    const apirouter = new Router();
    apirouter.use(koaBody());
    apirouter.post('/auth', async (ctx, next) => { await getAuthData(ctx); });
    return apirouter;
};

const getBaseRouter = async () => {
    const baserouter = new Router();
    const apirouter = await getApiRouter();
    baserouter.use('/api/v1', apirouter.routes(), apirouter.allowedMethods());
    return baserouter;
};

export default getBaseRouter;
