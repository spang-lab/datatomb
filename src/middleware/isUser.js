import { log } from '../util/index.js';

export default async (ctx, next) => {
    if( ! ctx.state.authdata.isUser ) {
        throw(new Error('only available to registered and allowed users.'));
    }
    log(`user access for ${ctx.state.authdata.user}`);
    await next();
};
