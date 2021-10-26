import {
    getDb, aliasExists,
} from '../database/index.js';
import { generateMnemonic } from '../util/index.js';

export default async (ctx, next) => {
    const db = getDb();
    let i = 1;
    let exists = true;
    /* eslint-disable no-await-in-loop */
    while (exists) {
        ctx.params.mnemonic = generateMnemonic(i);
        exists = await aliasExists(db, ctx.params.mnemonic);
        i += 1;
    }
    await next();
};
