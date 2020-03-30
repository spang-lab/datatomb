import { log, COLOR } from '../util/index.js';

export default async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        const message = err.toString();
        log(message, COLOR.RED);

        ctx.status = parseInt(err.status, 10) || ctx.status || 500;
        ctx.body = {
            ok: false,
            error: message,
        };
    }
};
