import {
    getDb, mayRead,
} from '../database/index.js';


export default async (ctx, next) => {
    const { hash } = ctx.params;
    if (!hash) {
        throw (new Error('no hash in context.'));
    }
    const db = getDb();
    if (await mayRead(db, ctx.state.authdata, hash)) {
        await next();
    } else {
        throw (new Error('unauthorized read.'));
    }
};
