import { log } from '../util/index.js';

export const search = (ctx) => {
    log(`searching for ${ctx.params.query}`);
    ctx.body = '1';
};
