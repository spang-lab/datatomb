import { log } from '../util/index.js';
import { getDb, getCreator } from '../database/index.js';

export default async (ctx, next) => {
    const { hash } = ctx.params;
    ctx.assert(hash,
        500,
        'no hash in context.');
    ctx.assert(ctx.state.authdata,
        500,
        'no authdata in context');
    ctx.assert(ctx.state.authdata.isUser,
        401,
        'only available to registered and allowed users.');

    const db = getDb();
    if (ctx.state.authdata.isAdmin) {
        log(`admin access for ${ctx.state.authdata.user}`);
        await next();
    } else {
        const owner = await getCreator(db, hash);
        log(`${ctx.state.authdata.user} tries to access a dataset that belongs to ${owner}`);
        if (ctx.state.authdata.user === owner) {
            log(`owner access for ${ctx.state.authdata.user}`);
            await next();
        } else {
            ctx.throw(401,
                `user ${ctx.state.authdata.user} is neither owner of ${hash} nor admin.`);
        }
    }
};
