import { log } from '../util/index.js';

export default async (ctx, next) => {
    ctx.assert(ctx.state.authdata.isUser,
        401,
        'only available to registered and allowed users.');
    log(`user access for ${ctx.state.authdata.user}`);
    await next();
};
