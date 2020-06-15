import { log } from '../util/index.js';
import { getDb, getWebhookOwner } from '../database/index.js';

export default async (ctx, next) => {
    const { id } = ctx.params;
    ctx.assert(id,
        500,
        'no id in context.');
    ctx.assert(ctx.state.authdata,
        500,
        'no authdata in context');
    ctx.assert(ctx.state.authdata.isUser,
        401,
        'only available to registered and allowed users.');

    if (ctx.state.authdata.isAdmin) {
        log(`admin access for ${ctx.state.authdata.user}`);
        await next();
    } else {
        log(id);
        const db = getDb();
        const owner = await getWebhookOwner(db, id);
        log(owner);
        ctx.assert(owner, 404, `no webhook with id ${id}`);
        log(`${ctx.state.authdata.user} tries to access a webhook that belongs to ${owner}`);
        if (ctx.state.authdata.user === owner) {
            log(`owner access for ${ctx.state.authdata.user}`);
            await next();
        } else {
            ctx.throw(401,
                `user ${ctx.state.authdata.user} is neither owner of webhook ${id} nor admin.`);
        }
    }
};
