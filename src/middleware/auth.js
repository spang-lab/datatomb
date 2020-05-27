import fetch from 'node-fetch';
import {
    log,
    getConfig,
    authenticate
} from '../util/index.js';

export default async (ctx, next) => {
    const authtoken = ctx.header.authorization;

    const config = getConfig();
    ctx.assert(config.authserver,
               500,
               'auth server not configured.');

    let authdata = undefined;
    try {
        authdata = await authenticate(config.authserver, authtoken);
    } catch(e) {
        ctx.throw(401, e);
    }

    console.log(authdata);
    ctx.state.authdata = authdata;
    await next();
};
