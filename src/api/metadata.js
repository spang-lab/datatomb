import { log } from '../util/index.js';

export const add = async (hash, metadata) => {
    log(`receiving metadata for hash = ${hash}`);
    log(`received: ${metadata}`);
};
export const get = (ctx) => {
    log(`getting metadata for hash = ${ctx.params.hash}`);
    ctx.body = `${ctx.params.hash}`;
};
export const rm = (ctx) => {
    log(`removing metadata for hash = ${ctx.params.hash}`);
    ctx.body = `${ctx.params.hash}`;
};
