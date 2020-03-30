import { getDb } from '../database/index.js';
import { log } from '../util/index.js';

export default async (ctx, next) => {
    const db = getDb(ctx);
    await db.tx(async (transaction) => {
        ctx.state.db = transaction;
        await next();
    }).catch((err) => {
        log('rolling back db transaction');
        throw (err);
    });
};
