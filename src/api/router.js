import Router from 'koa-router';
import koaBody from 'koa-body';
import search from './search.js';
import { get as getMetadata } from './metadata.js';
import {
    uploadDataset, getDataset, rmDataset, getLog, shredDataset, checkDataset
} from './dataset.js';
import {
    registerWebhook,
    getWebhook,
    deleteWebhook,
    listWebhooks,
    updateHookAuth,
} from './webhooks.js';
import {
    apiTransaction,
    apiError,
    apiAuth,
    isUser,
    isAdmin,
    isOwnerOrAdmin,
    mayRead,
    hashExists,
    isWebhookOwnerOrAdmin,
} from '../middleware/index.js';

const getApiRouter = async () => {
    const apirouter = new Router();
    apirouter.use(apiError);
    apirouter.use(apiTransaction);
    apirouter.use(apiAuth);
    apirouter.get('/meta/search', isUser, async (ctx) => { await search(ctx); });
    apirouter.get('/meta/:hash', hashExists, mayRead, async (ctx) => { await getMetadata(ctx); });
    apirouter.get('/healthy', (ctx) => { ctx.body = JSON.stringify({ ok: true }); });
    apirouter.post('/upload', isUser, async (ctx, next) => { await uploadDataset(ctx, next); });
    apirouter.get('/auth', (ctx) => { ctx.body = ctx.state.authdata; });
    apirouter.get('/log/:hash', isOwnerOrAdmin, async (ctx) => { await getLog(ctx); });
    apirouter.post('/webhooks/register', isUser, koaBody(), async (ctx) => { await registerWebhook(ctx); });
    apirouter.get('/webhooks/list', isUser, async (ctx) => { await listWebhooks(ctx); });
    apirouter.get('/webhooks/auth', isUser, async (ctx) => { await updateHookAuth(ctx); });
    apirouter.get('/webhooks/:id', isWebhookOwnerOrAdmin, async (ctx) => { await getWebhook(ctx); });
    apirouter.del('/webhooks/:id', isWebhookOwnerOrAdmin, async (ctx) => { await deleteWebhook(ctx); });
    apirouter.get('/admin/orphans', isAdmin, async (ctx) => { await listOrphans(ctx); });
    apirouter.post('/admin/shred/:hash', isAdmin, async (ctx) => { await shredDataset(ctx); });
    apirouter.get('/admin/check/:hash', isAdmin, async (ctx) => { await checkDataset(ctx); });
    apirouter.get('/:hash', hashExists, mayRead, async (ctx) => { await getDataset(ctx); });
    apirouter.del('/:hash', hashExists, isOwnerOrAdmin, async (ctx) => { await rmDataset(ctx); });
    return apirouter;
};

const getBaseRouter = async () => {
    const baserouter = new Router();
    const apirouter = await getApiRouter();
    baserouter.use('/api/v1', apirouter.routes(), apirouter.allowedMethods());
    return baserouter;
};

export default getBaseRouter;
