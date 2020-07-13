import fs from 'fs-extra';
import send from 'koa-send';
import sha256 from 'js-sha256';
import Busboy from 'busboy';
import { log } from '../util/index.js';
import { add as addMetadata } from './metadata.js';
import {
    getDb, addLog, getLog as getLogFromDb,
} from '../database/index.js';
import { get as getDsetstore } from '../context/dsetstore.js';
import { executeWebhooks } from './webhooks.js';

const hashFile = async (filename) => {
    const hash = sha256.create();
    return new Promise((resolve, reject) => {
        let readStream = fs.createReadStream(filename);
        readStream.on('error', err => {
            reject(err);
        });
        readStream.on('data', chunk => {
            hash.update(chunk);
        });
        readStream.on('close', () => {
            // Create a buffer of the image from the stream
            resolve(hash.hex());
        });
    });
}

export const uploadDataset = async (ctx, next) => {
    const busboy = new Busboy({ headers: ctx.req.headers });
    const dsetstore = await getDsetstore(ctx);
    // todo: better ways for a tmpfilename?
    if (!dsetstore.writable) {
        throw new Error('dataset store is not writable.');
    }
    const tmpfilename = [dsetstore.path, (Math.random() * 0xFFFFFFFFFFFFFF).toString(20)].join('/');
    log(`storing to tmpfile: ${tmpfilename}`);

    const [hashrep, metadata, havefile] = await new Promise((resolve, reject) => {
        const hash = sha256.create();
        var submittedHash = undefined;
        let havefile = false;
        let meta = null;
        busboy.on('file', (fieldname, file) => {
            log(`receiving file: ${fieldname}`);
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
            log(`receiving field: ${fieldname}`);
            if (fieldname === 'data') {
                meta = JSON.parse(val);
            } else if( fieldname === 'hash'){
                submittedHash = val;
            } else {
                reject(new Error('apart from the "file", only one other fieldname, "data" is allowed.'));
            }
        });
        busboy.on('finish', () => {
            log('finish upload.');
            var hashres = undefined;
            if( submittedHash ) {
                hashres = submittedHash;
            } else {
                hashres = hash.hex();
            }
            if (!( havefile || submittedHash ) || !meta) {
                reject(new Error('incomplete upload (either file or metadata is missing)'));
            }
            resolve([hashres, meta, havefile]);
        });
        ctx.req.pipe(busboy);
    });

    const finalfilename = [dsetstore.path, hashrep].join('/');
    const fexists = await fs.exists(finalfilename);

    if( havefile && !fexists ) {
        // file has been uploaded and doesn't yet exist in the dsetstore
        // (normal behaviour)
        // move tmpfile to its final destination (hash):
        await fs.rename(tmpfilename, finalfilename, (err) => { if (err) { throw err; } });
    } else if( !havefile && !fexists) {
        // NO file has been uploaded, but a hash was provided, but it  doesn't exist in the store.
        ctx.throw(400, 'file not submitted but it doesn\' exist, yet.');
    } else if( !havefile && fexists ){
        // file hasn't been uploaded but it exists (normal behaviour)
        // check that hash matches the file
        const actualhash = await hashFile(finalfilename);
        log(`checking hash ${actualhash}`);
        ctx.assert(actualhash === hashrep, 400, `file exists with name ${hashrep} exists but its actual hash is different: ${actualhash}.`);
    } else {
        // file has been uploaded but already exists.
        await fs.remove(tmpfilename);
        ctx.throw(400, 'file already exists. cannot upload twice.');
    }

    // add metadata for this file:
    ctx.state.hash = hashrep;
    ctx.state.meta = metadata;
    try {
        await addMetadata(ctx);
    } catch (e) {
        if( havefile ) {
            await fs.remove(finalfilename);
        }
        throw e;
    }
    const db = getDb();
    const { user } = ctx.state.authdata;
    await addLog(db, hashrep, user, 'created');

    ctx.body = JSON.stringify(
        {
            hash: hashrep,
            algo: 'sha256sum',
            action: 'created',
        },
    );

    // while processing webhooks:
    log('processing any existing webhooks...');
    // we do NOT await this, but return early.
    executeWebhooks(ctx);
};

export const getDataset = async (ctx) => {
    const { hash } = ctx.params;
    log(`getting dataset for hash = ${hash}`);
    // log read:
    const { user } = ctx.state.authdata;
    const db = getDb();
    const p = addLog(db, hash, user, 'read');

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
    // log deletion:
    try {
        const { user } = ctx.state.authdata;
        const db = getDb();
        const p = addLog(db, hash, user, 'deleted');
        await p;
    } catch (e) {
        ctx.throw(500,
            `cannot log dataset removal: ${e.message}`);
    }

    try {
        const dsetstore = await getDsetstore(ctx);
        if (!dsetstore.writable) {
            throw (new Error('dataset store is not writable.'));
        }
        const filename = [dsetstore.path, hash].join('/');
        if (!await fs.exists(filename)) {
            throw (new Error(`dataset ${hash} does not exist.`));
        }

        await fs.remove(filename);
    } catch (e) {
        ctx.throw(500,
            `cannot remove the file: ${e.message}`);
    }

    ctx.body = JSON.stringify(
        {
            hash,
            algo: 'sha256sum',
            action: 'deleted',
        },
    );
};
export const getLog = async (ctx) => {
    log(`getting log for hash = ${ctx.params.hash}`);
    const { hash } = ctx.params;
    const db = getDb();
    const logdata = await getLogFromDb(db, hash);
    ctx.body = JSON.stringify(logdata);
};
