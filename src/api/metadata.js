import Busboy from 'busboy';
import { log } from '../util/index.js';
import {
    datasetExists, getDb, addLog, getMetadata, addDatasetToDb, shredMetadata, updateMetadata,
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
export const update = async (ctx) => {
    const { hash } = ctx.params;
    const { user } = ctx.state.authdata;
    const busboy = new Busboy({ headers: ctx.req.headers });
    log(`updating metadata for hash = ${hash}`);
    if (!await datasetExists(ctx, hash)) {
        throw (new Error('dataset does not exist or has been deleted.'));
    }
    const metadata = await new Promise((resolve, reject) => {
        let meta = null;
        busboy.on('file', () => {
            reject(new Error('metadata update may not contain new actual data.'));
        });
        busboy.on('field', (fieldname, val) => {
            if (fieldname === 'data') {
                meta = JSON.parse(val);
            }
        });
        busboy.on('finish', () => {
            if (!meta) {
                reject(new Error('metadata update did not include data field.'));
            }
            resolve(meta);
        });
        ctx.req.pipe(busboy);
    });

    const db = getDb();
    await updateMetadata(db, hash, metadata);
    await addLog(db, hash, user, 'updated');
    ctx.body = 'ok';
};
