import {
    getConfig,
    authenticate,
} from '../util/index.js';

export default async (ctx, next) => {
    let authtoken = ctx.header.authorization;
    // for backwards compatibility, we add a "Bearer" if there is just one token word:
    if (authtoken.split(' ').length < 2) {
        authtoken = `Bearer ${authtoken}`;
    }

    const config = getConfig();
    ctx.assert(config.authserver,
        500,
        'auth server not configured.');

    try {
        ctx.state.authdata = await authenticate(config.authserver, authtoken);
    } catch (e) {
        ctx.throw(401, e);
    }
    await next();
};
