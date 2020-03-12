import { datasetExists, log } from '../util/index.js';
import { getDb, getMetadata, addDatasetToDb } from '../database/index.js';

export const add = async ( ctx ) => {
    log(`receiving metadata for hash = ${ctx.state.hash}`);
    log(`received: ${ctx.state.meta}`);
    const db = getDb();
    await addDatasetToDb(db, ctx.state.hash, ctx.state.meta);
};
export const get = async (ctx) => {
    const hash = ctx.params.hash;
    log(`getting metadata for hash = ${hash}`);
    if( ! await datasetExists(ctx, hash) ) {
        throw(new Error(`dataset does not exist or has been deleted.`));
    }
    const db = getDb();
    const metadata = await getMetadata(db, hash);
    ctx.body = JSON.stringify(metadata);
};
