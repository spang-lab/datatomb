import { log } from '../util/index.js';
import {
    datasetExists, getDb, getMetadata, addDatasetToDb, shredMetadata
} from '../database/index.js';

export const add = async (ctx) => {
    log(`receiving metadata for hash = ${ctx.state.hash}`);
    const db = getDb();
    try {
        await addDatasetToDb(db, ctx.state.hash, ctx.state.meta);
    } catch (e) {
        ctx.throw(400,
            `cannot add metadata to db: ${e.message}`);
    }
};
export const get = async (ctx) => {
    const { hash } = ctx.params;
    if (!await datasetExists(ctx, hash)) {
        throw (new Error('dataset does not exist or has been deleted.'));
    }
    log(`getting metadata for hash = ${hash}`);
    const db = getDb();
    const metadata = await getMetadata(db, hash);
    ctx.body = JSON.stringify(metadata);
};
export const shred = async (ctx) => {
    const { hash } = ctx.params;
    const db = getDb();
    shredMetadata(db, hash);
};
