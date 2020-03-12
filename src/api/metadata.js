import { log } from '../util/index.js';
import { getDb, addDatasetToDb } from '../database/index.js';

export const add = async ( ctx ) => {
    log(`receiving metadata for hash = ${ctx.state.hash}`);
    log(`received: ${ctx.state.meta}`);
    const db = getDb();
    await addDatasetToDb(db, ctx.state.hash, ctx.state.meta);
};
export const get = async (ctx) => {
    log(`getting metadata for hash = ${ctx.params.hash}`);
    ctx.body = `${ctx.params.hash}`;
};
export const rm = async (ctx) => {
    log(`removing metadata for hash = ${ctx.params.hash}`);
    ctx.body = `${ctx.params.hash}`;
};
