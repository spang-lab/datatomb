import {
    getDb, mayRead,
} from '../database/index.js';

export default async (ctx, next) => {
    const { hash } = ctx.params;
    ctx.assert(hash,
        500,
        'no hash in context.');

    const db = getDb();
    if (await mayRead(db, ctx.state.authdata, hash)) {
        await next();
    } else {
        ctx.throw(401, 'unauthorized read.');
    }
};
