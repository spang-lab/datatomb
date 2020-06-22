import Router from 'koa-router';
import koaBody from 'koa-body';

const delay = ms => new Promise(res => setTimeout(res, ms));
const postWebhook = async(ctx) => {
  console.log('received post:');
  console.log(ctx.request.body);
  console.log('returning.');
  ctx.body = "just a normal webhook doing thothing";
}
const postWebhookWait = async(ctx) => {
  console.log('received post:');
  console.log(ctx.request.body);
  console.log('waiting for 5 seconds...:');
  await delay(5000);
  console.log('returning.');
  ctx.body = "waited for 5 seconds and returned.";
}
const postWebhookFail = async(ctx) => {
  console.log('received post:');
  console.log(ctx.request.body);
  console.log('failing...:');
  ctx.assert(false, 'this webhook failed on purpose');
}

const getApiRouter = async () => {
    const apirouter = new Router();
    apirouter.use(koaBody());
    apirouter.post('/webhook', async (ctx, next) => { await postWebhook(ctx, next); });
    apirouter.post('/webhookWait', async (ctx, next) => { await postWebhookWait(ctx, next); });
    apirouter.post('/webhookFail', async (ctx, next) => { await postWebhookFail(ctx, next); });
    return apirouter;
};

const getBaseRouter = async () => {
    const baserouter = new Router();
    const apirouter = await getApiRouter();
    baserouter.use('/api/v1', apirouter.routes(), apirouter.allowedMethods());
    return baserouter;
};

export default getBaseRouter;
