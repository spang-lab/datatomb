import {
    getDb, aliasExists, aliasExistedAtTime,
} from '../database/index.js';

export default async (ctx, next) => {
    const db = getDb();
    const { time } = ctx.state;

    if (time) {
        ctx.assert(await aliasExistedAtTime(db, ctx.params.mnemonic, time),
                   404,
                   `alias ${ctx.params.mnemonic} did not exist at time ${time}.`);
    } else {
        ctx.assert(await aliasExists(db, ctx.params.mnemonic),
                404,
                `alias ${ctx.params.mnemonic} does not exist.`);
    }
    await next();
};
