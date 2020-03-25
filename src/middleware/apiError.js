import {log, dbg, COLOR} from '../util/index.js';

export default async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        const message = err.toString();
        log(message, COLOR.RED);
        dbg(ctx.response)
        if( ctx.response.status === 404) {
            // we allow the status to be set outside, but if we haven't done this we shouldn't return OK...
            // I don't know why, but koa states that the default is set to 404, although then at some point 200 is returned.
            // still, if we haven't set it to anything else, set it to 500:
            ctx.response.status = 500;
        }
        ctx.body = {
            ok: false,
            error: message,
        };
    }
};
