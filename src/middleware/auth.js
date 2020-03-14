import fetch from 'node-fetch';
import {
    log,
    getConfig,
} from '../util/index.js';

const isInGroup = (userdata, groupname) => {
    const res = userdata.groups.find((g) => (g.name === groupname));
    if (res) {
        return true;
    }
    return (false);
};
export default async (ctx, next) => {
    const authtoken = ctx.header.authorization;

    if (authtoken) {
        const config = getConfig();
        const { url, usergroup, admingroup } = config.authserver;

        log(`contacting authserver ${url}`);
        const userdata = await fetch(url, {
            method: 'post',
            body: JSON.stringify({ token: authtoken }),
            headers: { 'Content-Type': 'application/json' },
        }).then((res) => res.json());

        log(`user ${userdata.sub} authenticated.`);

        ctx.state.authdata = {
            user: userdata.sub,
            isAdmin: isInGroup(userdata, admingroup),
            isUser: isInGroup(userdata, usergroup),
            authenticated: true,
        };
    } else {
        log('anonymous access');
        ctx.state.authdata = {
            user: 'anonymous',
            isAdmin: false,
            isUser: false,
            authenticated: false,
        };
    }
    await next();
};
