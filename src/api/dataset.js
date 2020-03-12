import { log } from '../util/index.js';
import { add as addMetadata,
         rm as rmMetadata } from './metadata.js';
import fs from 'fs-extra';
import {get as getDsetstore} from '../context/dsetstore.js';
import send from 'koa-send';
import sha256 from 'js-sha256';
import Busboy from 'busboy';

export const uploadDataset = async (ctx) => {
    console.log('upload dataset.');

    var busboy = new Busboy({ headers: ctx.req.headers });
    const dsetstore = await getDsetstore(ctx);
    // todo: better ways for a tmpfilename?
    if( ! dsetstore.writable ) {
        throw new Error('dataset store is not writable.');
    }
    const tmpfilename = [dsetstore.path, (Math.random()*0xFFFFFFFFFFFFFF).toString(20)].join('/');
    log(`storing to tmpfile: ${tmpfilename}`);

    const [hashrep, metadata] = await new Promise( (resolve, reject) => {
        let hash = sha256.create();
        let havefile = false;
        let meta = null;
        busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
            if( fieldname != 'file' ) {
                reject(new Error('only fieldnames with called "file" may contain file upload data.'));
            }

            havefile = true;
            console.log('file ['+fieldname+']: filename: ' + filename);
            // write data to disk
            file.pipe(fs.createWriteStream(tmpfilename));

            file.on('data', function(data) {
                console.log('File ['+fieldname+'] got ' + data.length + ' bytes');
                hash.update(data);
            });
            file.on('end', function() {
                const hashrep = hash.hex();
                console.log(`File finished: ${hashrep}`);
            });
        });
        busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
            if( fieldname != 'data' ){
                reject(new Error('apart from the "file", only one other fieldname, "data" is allowed.'));
            }
            meta = JSON.parse(val);
        });
        busboy.on('finish', () => {
            if( ! havefile | ! meta ) {
                reject(new Error('incomplete upload (either file or metadata is missing)'));
            }
            resolve([hash.hex(), meta]);
        });
        ctx.req.pipe(busboy);
    });

    const finalfilename = [dsetstore.path, hashrep].join('/');
    if( await fs.exists(finalfilename) ) {
        await fs.remove(tmpfilename);
        throw(new Error('file already exists. cannot upload twice.'));
    }

    // move tmpfile to its final destination (hash):
    await fs.rename(tmpfilename, finalfilename, (err) => { if( err ) { throw err; } });

    // add metadata for this file:
    ctx.state.hash = hashrep;
    ctx.state.meta = metadata;
    await addMetadata(ctx);

    ctx.body = JSON.stringify(
        {
            hash: hashrep,
            algo: "sha256sum"
        });
};
export const getDataset = async (ctx) => {
    log(`getting dataset for hash = ${ctx.params.hash}`);
    const dsetstore = await getDsetstore(ctx);
    // todo: log read
    await send(ctx,
               ctx.params.hash,
               {
                   root: dsetstore.path,
                   immutable: true
               }
              );
};
export const rmDataset = async (ctx) => {
    log(`removing dataset for hash = ${ctx.params.hash}`);
    const hash = ctx.params.hash;
    const dsetstore = await getDsetstore(ctx);
    if( ! dsetstore.writable ) {
        throw(new Error('dataset store is not writable.'));
    }
    const filename = [dsetstore.path, hash].join('/');
    console.log(filename);
    if( ! await fs.exists(filename) ){
        throw(new Error(`dataset ${hash} does not exist.`));
    }

    await fs.remove(filename);

    ctx.state.hash = hash;
    await rmMetadata(ctx);
    ctx.body = `${hash}`;
};
export const getLog = async (ctx) => {
    log(`getting log for hash = ${ctx.params.hash}`);
    ctx.body = `log for ${ctx.params.hash}`;
}
