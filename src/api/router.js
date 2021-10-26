import Router from '@koa/router';
import koaBody from 'koa-body';
import { getConfig } from '../util/index.js';
import search from './search.js';
import { get as getMetadata, update as updateMetadata } from './metadata.js';
import {
    uploadDataset, getDataset, rmDataset, getLog, shredDataset, checkDataset, listOrphans,
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
    resolveIdentifier,
    isWebhookOwnerOrAdmin,
    createMnemonic,
} from '../middleware/index.js';

const packageInfo = (ctx) => {
    const cfg = getConfig();
    ctx.body = `${cfg.packageName} v${cfg.packageVersion}`;
};
const getApiRouter = async () => {
    const apirouter = new Router();
    apirouter.use(apiError);
    apirouter.use(apiTransaction);
    apirouter.use(apiAuth);
    // METADATA
    apirouter.get('/meta/search', isUser, async (ctx) => { await search(ctx); });
    apirouter.get('/meta/:dsetid', resolveIdentifier, hashExists, mayRead, async (ctx) => { await getMetadata(ctx); });
    apirouter.post('/meta/update/:dsetid', resolveIdentifier, hashExists, isOwnerOrAdmin, async (ctx) => { await updateMetadata(ctx); });
    // logs
    apirouter.get('/log/:dsetid', resolveIdentifier, isOwnerOrAdmin, async (ctx) => { await getLog(ctx); });
    // name resolution
    apirouter.get('/resolve/:dsetid', resolveIdentifier, hashExists, mayRead, async (ctx) => { ctx.body = JSON.stringify(ctx.params.hash); });
    apirouter.post('/alias', isUser, createMnemonic, async (ctx) => { ctx.body = ctx.params.mnemonic; });
    // helpers
    apirouter.get('/healthy', (ctx) => { ctx.body = JSON.stringify({ ok: true }); });
    apirouter.get('/auth', (ctx) => { ctx.body = ctx.state.authdata; });
    apirouter.get('/version', (ctx) => { packageInfo(ctx); });
    // dataset upload
    apirouter.post('/upload', isUser, async (ctx, next) => { await uploadDataset(ctx, next); });
    // WEBHOOKS
    apirouter.post('/webhooks/register', isUser, koaBody(), async (ctx) => { await registerWebhook(ctx); });
    apirouter.get('/webhooks/list', isUser, async (ctx) => { await listWebhooks(ctx); });
    apirouter.get('/webhooks/auth', isUser, async (ctx) => { await updateHookAuth(ctx); });
    apirouter.get('/webhooks/:id', isWebhookOwnerOrAdmin, async (ctx) => { await getWebhook(ctx); });
    apirouter.del('/webhooks/:id', isWebhookOwnerOrAdmin, async (ctx) => { await deleteWebhook(ctx); });
    // ADMIN
    apirouter.get('/admin/orphans', isAdmin, async (ctx) => { await listOrphans(ctx); });
    apirouter.post('/admin/shred/:dsetid', resolveIdentifier, isAdmin, async (ctx) => { await shredDataset(ctx); });
    apirouter.get('/admin/check/:dsetid', resolveIdentifier, isAdmin, async (ctx) => { await checkDataset(ctx); });
    // direct access to the datasets
    apirouter.get('/:dsetid', resolveIdentifier, hashExists, mayRead, async (ctx) => { await getDataset(ctx); });
    apirouter.del('/:dsetid', resolveIdentifier, hashExists, isOwnerOrAdmin, async (ctx) => { await rmDataset(ctx); });
    return apirouter;
};

const getBaseRouter = async () => {
    const baserouter = new Router();
    const apirouter = await getApiRouter();
    baserouter.use('/api/v1', apirouter.routes(), apirouter.allowedMethods());
    return baserouter;
};

export default getBaseRouter;
