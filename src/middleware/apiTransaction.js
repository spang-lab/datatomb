import { getDb } from '../database/index.js';
import { log } from '../util/index.js';

export default async (ctx, next) => {
    log("starting db transaction");
    const db = getDb(ctx);
    await db.tx(async (transaction) => {
        ctx.state.db = transaction;
        log("set context state db.");
        await next();
    }).then(()=>{
        log("committing db transaction");
    }).catch((err) => {
        log("rolling back db transaction");
        throw(err);
    });
};