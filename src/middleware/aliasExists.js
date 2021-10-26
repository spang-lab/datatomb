import {
    getDb, aliasExists,
} from '../database/index.js';

export default async (ctx, next) => {
    const db = getDb();
    console.log("alias exists?");
    console.log(ctx.params.mnemonic);
    ctx.assert(await aliasExists(db, ctx.params.mnemonic),
               404,
               `alias ${ctx.params.mnemonic} does not exist.`);
    await next();
};
