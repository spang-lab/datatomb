import { log } from '../util/index.js';
import fs from 'fs';
import {get as getDsetstore} from '../context/dsetstore.js';

export const putDataset = async (ctx) => {
    log(`receiving dataset for hash = ${ctx.params.hash}`);
    const dsetstore = getDsetstore(ctx);
    log(`filename: ${dsetstore}`);
    ctx.req.pipe(fs.createWriteStream("uploadedfile"));
    ctx.body = `${ctx.params.hash}`;
};
export const getDataset = (ctx) => {
    log(`getting dataset for hash = ${ctx.params.hash}`);
    ctx.body = `${ctx.params.hash}`;
};
export const rmDataset = (ctx) => {
    log(`removing dataset for hash = ${ctx.params.hash}`);
    ctx.body = `${ctx.params.hash}`;
};
export const getLog = (ctx) => {
    log(`getting log for hash = ${ctx.params.hash}`);
    ctx.body = `log for ${ctx.params.hash}`;
}
