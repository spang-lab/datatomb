import { log } from '../util/index.js';
import { getDb, getCreator } from '../database/index.js';

export default async (ctx, next) => {
    const hash = ctx.params.hash;
    if( ! hash ) {
        throw(new Error('no hash in context.'));
    }
    if( ! ctx.state.authdata.isUser ) {
        throw(new Error('only available to registered and allowed users.'));
    }
    const db = getDb();
    if( ctx.state.authdata.isAdmin ) {
        log(`admin access for ${ctx.state.authdata.user}`);
        await next();
    } else {
        const owner = await getCreator(db, hash);
        log(`${ctx.state.authdata.user} tries to access a dataset that belongs to ${owner}`);
        if( ctx.state.authdata.user === owner ) {
            log(`owner access for ${ctx.state.authdata.user}`);
            await next();
        } else {
            throw(new Error(`user ${ctx.state.authdata} is neither owner of ${hash} nor admin.`));
        }
    }
};
