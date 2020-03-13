import { log } from '../util/index.js';
import { getDb, getCreator, getShareState, mayRead } from '../database/index.js';


export default async (ctx, next) => {
    const hash = ctx.params.hash;
    if( ! hash ) {
        throw(new Error('no hash in context.'));
    }
    const db = getDb();
    if( await mayRead(db, ctx.state.authdata, hash) ){
        await next();
    } else {
        throw(new Error('unauthorized read.'));
    };
};
