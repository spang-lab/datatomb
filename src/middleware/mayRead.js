import { log } from '../util/index.js';
import { getDb, getCreator, getShareState } from '../database/index.js';

export default async (ctx, next) => {
    const hash = ctx.params.hash;
    if( ! hash ) {
        throw(new Error('no hash in context.'));
    }
    const db = getDb();
    if( ctx.state.authdata.isAdmin ) {
        log(`admin access for ${ctx.state.authdata.user}`);
        await next();
    } else {
        const share = await getShareState(db, hash);
        log(`access to ${hash} is ${share}.`);

        if( share === 'public' ) {
            await next();
        } else if( share === 'internal' ) {
            if( ctx.state.authdata.isUser ) {
                await next();
            } else {
                throw(new Error('user is not a datatomb user.'));
            }
        } else if( share === 'private' ) {
            const owner = await getCreator(db, hash);
            if( owner === ctx.state.authdata.user ) {
                await next();
            } else {
                throw(new Error(`user ${ctx.state.authdata.user} is not the owner of ${hash}.`));
            }
        } else {
            throw(new Error(`unknown sharestate.`));
        }
    }
};
