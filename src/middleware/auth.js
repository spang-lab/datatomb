import {
    getConfig,
    authenticate,
} from '../util/index.js';

export default async (ctx, next) => {
    let authtoken = ctx.header.authorization;
    // for backwards compatibility, we add a "Bearer" if there is just one token word:
    if (authtoken && authtoken.split(' ').length < 2) {
        authtoken = `Bearer ${authtoken}`;
    }
    // no authtoken no authentication:
    if (!authtoken) {
        ctx.state.authdata = {
            user: 'anonymous',
            isAdmin: false,
            isUser: false,
            authenticated: false,
        };
        await next();
        return;
    }

    const config = getConfig();
    ctx.assert(config.authentication && config.authentication.kind,
        500,
        'authentication not configured.');

    if (config.authentication.kind === 'acrux') {
        try {
            ctx.state.authdata = await authenticate(config.authentication, authtoken);
        } catch (e) {
            ctx.throw(401, e);
        }
    } else if (config.authentication.kind === 'file') {
        if (config.authentication.users) {
            // decode "authtoken" (which is not really a token)
            // throw away the "bearer"
            let authdata = atob(authtoken.split(' ')[1]);
            if (!authdata) {
                ctx.throw(401, 'invalid auth string');
            }
            authdata = authdata.split(',');
            if (!authdata) {
                ctx.throw(401, 'invalid auth string');
            }
            const user = authdata[0];
            const pwhash = authdata[1];
            if (!config.authentication.users[user]) {
                ctx.throw(401, `no user ${user}`);
            }
            if (!config.authentication.users[user].password === pwhash) {
                ctx.throw(401, 'incorrect password');
            }

            ctx.state.authdata = {
                user,
                isAdmin: config.authentication.users[user].role === 'admin',
                isUser: config.authentication.users[user].role === 'user' || config.authentication.users[user].role === 'admin',
                authenticated: true,
            };
        }
    } else {
        ctx.throw(500, 'misconfigured authentication.');
    }
    await next();
};
