import {
    getDb, datasetExists,
} from '../database/index.js';


export default async (ctx, next) => {
    const { hash } = ctx.params;
    ctx.assert(hash,
        500,
        'no hash in context.');
    const db = getDb(ctx);
    ctx.assert(await datasetExists(db, hash),
        404,
        `hash ${hash} does not exist.`);
    await next();
};
