import { log } from '../util/index.js';

export const putMetadata = (ctx) => {
    log(`receiving metadata for hash = ${ctx.params.hash}`);
    ctx.body = `${ctx.params.hash}`;
};
export const getMetadata = (ctx) => {
    log(`getting metadata for hash = ${ctx.params.hash}`);
    ctx.body = `${ctx.params.hash}`;
};
export const rmMetadata = (ctx) => {
    log(`removing metadata for hash = ${ctx.params.hash}`);
    ctx.body = `${ctx.params.hash}`;
};
