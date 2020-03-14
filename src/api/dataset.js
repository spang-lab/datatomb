import fs from 'fs-extra';
import send from 'koa-send';
import sha256 from 'js-sha256';
import Busboy from 'busboy';
import { log } from '../util/index.js';
import { add as addMetadata } from './metadata.js';
import {
    getDb, addLog, getLog as getLogFromDb, datasetExists,
} from '../database/index.js';
import { get as getDsetstore } from '../context/dsetstore.js';

export const uploadDataset = async (ctx) => {
    const busboy = new Busboy({ headers: ctx.req.headers });
    const dsetstore = await getDsetstore(ctx);
    // todo: better ways for a tmpfilename?
    if (!dsetstore.writable) {
        throw new Error('dataset store is not writable.');
    }
    const tmpfilename = [dsetstore.path, (Math.random() * 0xFFFFFFFFFFFFFF).toString(20)].join('/');
    log(`storing to tmpfile: ${tmpfilename}`);

    const [hashrep, metadata] = await new Promise((resolve, reject) => {
        const hash = sha256.create();
        let havefile = false;
        let meta = null;
        busboy.on('file', (fieldname, file) => {
            if (fieldname !== 'file') {
                reject(new Error('only fieldnames with called "file" may contain file upload data.'));
            }

            havefile = true;
            // write data to disk
            log('File upload started');
            file.pipe(fs.createWriteStream(tmpfilename));

            file.on('data', (data) => {
                hash.update(data);
            });
            file.on('end', () => {
                log(`File upload finished, hash: ${hash.hex()}`);
            });
        });
        busboy.on('field', (fieldname, val) => {
            if (fieldname !== 'data') {
                reject(new Error('apart from the "file", only one other fieldname, "data" is allowed.'));
            }
            meta = JSON.parse(val);
        });
        busboy.on('finish', () => {
            if (!havefile || !meta) {
                reject(new Error('incomplete upload (either file or metadata is missing)'));
            }
            resolve([hash.hex(), meta]);
        });
        ctx.req.pipe(busboy);
    });

    const finalfilename = [dsetstore.path, hashrep].join('/');
    if (await fs.exists(finalfilename)) {
        await fs.remove(tmpfilename);
        throw (new Error('file already exists. cannot upload twice.'));
    }

    // move tmpfile to its final destination (hash):
    await fs.rename(tmpfilename, finalfilename, (err) => { if (err) { throw err; } });

    // add metadata for this file:
    ctx.state.hash = hashrep;
    ctx.state.meta = metadata;
    await addMetadata(ctx);
    const db = getDb();
    const { user } = ctx.state.authdata;
    await addLog(db, hashrep, user, 'created');

    ctx.body = JSON.stringify(
        {
            hash: hashrep,
            algo: 'sha256sum',
        },
    );
};

export const getDataset = async (ctx) => {
    const { hash } = ctx.params;
    if (!await datasetExists(ctx, hash)) {
        throw (new Error(`dataset ${hash} does not exist.`));
    }
    log(`getting dataset for hash = ${hash}`);
    // log read:
    const p = addLog(ctx, hash, 'read');

    // send the data:
    const dsetstore = await getDsetstore(ctx);
    await send(ctx,
        hash,
        {
            root: dsetstore.path,
            immutable: true,
        });
    await p;
};
export const rmDataset = async (ctx) => {
    const { hash } = ctx.params;
    log(`removing dataset for hash = ${ctx.params.hash}`);
    if (!await datasetExists(ctx, hash)) {
        throw (new Error(`dataset ${hash} does not exist.`));
    }
    // log deletion:
    const p = addLog(ctx, hash, 'deleted');

    const dsetstore = await getDsetstore(ctx);
    if (!dsetstore.writable) {
        throw (new Error('dataset store is not writable.'));
    }
    const filename = [dsetstore.path, hash].join('/');
    if (!await fs.exists(filename)) {
        throw (new Error(`dataset ${hash} does not exist.`));
    }

    await fs.remove(filename);

    ctx.body = `${hash}`;
    await p;
};
export const getLog = async (ctx) => {
    log(`getting log for hash = ${ctx.params.hash}`);
    const { hash } = ctx.params;
    const db = getDb();
    const logdata = await getLogFromDb(db, hash);
    ctx.body = JSON.stringify(logdata);
};
