import { log } from '../util/index.js';

export const putDataset = (ctx) => {
    log(`receiving dataset for hash = ${ctx.params.hash}`);
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
