import fs from 'fs-extra';
import send from 'koa-send';
import sha256 from 'js-sha256';
import Busboy from 'busboy';
import { log } from '../util/index.js';
import { add as addMetadata, shred as shredMetadata } from './metadata.js';
import {
    getDb, addLog, getLog as getLogFromDb, allNonDeletedDatasets, getDatasetState, DatasetState,
} from '../database/index.js';
import { get as getDsetstore } from '../context/dsetstore.js';
import { executeWebhooks } from './webhooks.js';

const hashFile = async (filename) => {
    const hash = sha256.create();
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(filename);
        readStream.on('error', (err) => {
            reject(err);
        });
        readStream.on('data', (chunk) => {
            hash.update(chunk);
        });
        readStream.on('close', () => {
            // Create a buffer of the image from the stream
            resolve(hash.hex());
        });
    });
};

export const uploadDataset = async (ctx) => {
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
        let submittedHash;
        let haveFileP = false;
        let meta = null;
        busboy.on('file', (fieldname, file) => {
            log(`receiving file: ${fieldname}`);
            if (fieldname !== 'file') {
                busboy.emit('error',
                    new Error('only fieldnames with called "file" may contain file upload data.'));
            }

            haveFileP = true;
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
            } else if (fieldname === 'hash') {
                submittedHash = val;
            } else {
                busboy.emit('error',
                    new Error('apart from the "file", only one other fieldname, "data" is allowed.'));
            }
        });
        busboy.on('finish', () => {
            log('finish upload.');
            let hashres;
            if (submittedHash) {
                hashres = submittedHash;
            } else {
                hashres = hash.hex();
            }
            if (!(haveFileP || submittedHash) || !meta) {
                busboy.emit('error', new Error('incomplete upload (either file or metadata is missing)'));
            }
            resolve([hashres, meta, haveFileP]);
        });
        busboy.on('error', async (err) => {
            if (await fs.exists(tmpfilename)) {
                await fs.remove(tmpfilename);
            }
            reject(err);
        });
        ctx.req.pipe(busboy);
    });

    const db = getDb();
    const finalfilename = [dsetstore.path, hashrep].join('/');
    const [dsetstate, fexists] = await Promise.all(
        [getDatasetState(db, hashrep), fs.exists(finalfilename)],
    );

    if (dsetstate === DatasetState.CREATED) {
        ctx.throw(400, 'file is already a dataset.');
    }

    if (havefile && !fexists) {
        // file has been uploaded and doesn't yet exist in the dsetstore
        // (normal behaviour)
        // move tmpfile to its final destination (hash):
        await fs.rename(tmpfilename, finalfilename, (err) => { if (err) { throw err; } });
    } else if (!havefile && !fexists) {
        // NO file has been uploaded, but a hash was provided, but it  doesn't exist in the store.
        ctx.throw(400, 'file not submitted but it doesn\'t exist, yet.');
    } else if (!havefile && fexists) {
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
        if (havefile) {
            await fs.remove(finalfilename);
        }
        throw e;
    }
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
export const shredDataset = async (ctx) => {
    const { hash } = ctx.params;
    log(`shredding dataset for hash = ${hash}`);
    try {
        await shredMetadata(ctx);
        log('done shredding metadata');
    } catch (e) {
        ctx.throw(500,
            `couldn't shred metadata of hash ${hash}: ${e.message}`);
    }

    try {
        const dsetstore = await getDsetstore(ctx);
        if (!dsetstore.writable) {
            throw (new Error('dataset store is not writable.'));
        }
        const filename = [dsetstore.path, hash].join('/');
        if (!await fs.exists(filename)) {
            log('dataset does not exist on disk. only removing metadata.');
        } else {
            await fs.remove(filename);
        }
    } catch (e) {
        ctx.throw(500,
            `cannot remove the file: ${e.message}`);
    }

    ctx.body = JSON.stringify(
        {
            hash,
            algo: 'sha256sum',
            action: 'shredded',
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

export const checkDataset = async (ctx) => {
    log(`checking file consistency for hash = ${ctx.params.hash}`);
    const { hash } = ctx.params;
    const dsetstore = await getDsetstore(ctx);
    const filename = [dsetstore.path, hash].join('/');
    const fexists = await fs.exists(filename);
    if (!fexists) {
        ctx.body = JSON.stringify(
            {
                ok: false,
                expected: hash,
                actual: 'file does not exist',
            },
        );
    } else {
        const actualhash = await hashFile(filename);
        if (actualhash === hash) {
            ctx.body = JSON.stringify(
                {
                    ok: true,
                    expected: hash,
                    actual: hash,
                },
            );
        } else {
            ctx.body = JSON.stringify(
                {
                    ok: false,
                    expected: hash,
                    actual: actualhash,
                },
            );
        }
    }
};

export const listOrphans = async (ctx) => {
    const db = getDb();
    const dsets = await allNonDeletedDatasets(db);
    log('return all nondel');
    const dsetstore = await getDsetstore(ctx);
    const exists = await Promise.all(dsets.map((hash) => {
        const filename = [dsetstore.path, hash].join('/');
        return (fs.exists(filename));
    }));
    const orphans = dsets.filter((hash, index) => (!exists[index]));

    ctx.body = JSON.stringify(orphans);
};
