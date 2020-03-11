import { log } from '../util/index.js';
import fs from 'fs';
import {get as getDsetstore} from '../context/dsetstore.js';
import multer from 'koa-multer';
import send from 'koa-send';
import BinaryFile from 'binary-file';
import sha256 from 'js-sha256';

export const uploadDataset = async (ctx) => {
    // at this point, the file has already been uploaded and stored to
    const filepath = ctx.req.file.path;
    // now, we compute its hash:
    let hash = sha256.create();

    const f = new BinaryFile(filepath, 'r', true);
    await f.open();
    const buffersize = 100;
    const fsize = await f.size();
    log(`size: ${fsize}`);
    for ( var i = 0; i < fsize/buffersize; i++) {
        //log(i);
        const b = await f.read(buffersize);
        log(b);
        hash.update(b);
    }
    const hashrep = hash.hex();
    log(hashrep);


    console.log("upload done?");
    // file properties:
    console.log(ctx.req.file);

    // parse and store metadata:
    const data = JSON.parse(ctx.req.body.data);
    ctx.body = 'done';
};
export const getDataset = async (ctx) => {
    log(`getting dataset for hash = ${ctx.params.hash}`);
    const dsetstore = getDsetstore(ctx);
    try {
        await send(ctx,
                   ctx.params.hash,
                   {
                       root: dsetstore.path,
                       immutable: true
                   }
                  );
    } catch(err) {
        log(err);
    }
};
export const rmDataset = (ctx) => {
    log(`removing dataset for hash = ${ctx.params.hash}`);
    ctx.body = `${ctx.params.hash}`;
};
export const getLog = (ctx) => {
    log(`getting log for hash = ${ctx.params.hash}`);
    ctx.body = `log for ${ctx.params.hash}`;
}
