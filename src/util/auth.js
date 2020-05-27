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
export default async (authserverconfig, authtoken) => {
    if (authtoken) {
        const { url, usergroup, admingroup } = authserverconfig;

        log(`contacting authserver ${url}`);
        const userdata = await fetch(url, {
            method: 'post',
            body: JSON.stringify({ token: authtoken }),
            headers: { 'Content-Type': 'application/json' },
        }).then((res) => res.json());

        log(`user ${userdata.sub} authenticated.`);

        if (typeof userdata.ok !== 'undefined' && !userdata.ok) {
            if (userdata.error) {
                throw(`authserver returned: ${userdata.error}`);
            } else {
                throw('authserver returned generic error.');
            }
        }
        return ({
            user: userdata.sub,
            isAdmin: isInGroup(userdata, admingroup),
            isUser: isInGroup(userdata, usergroup),
            authenticated: true,
        });
    } else {
        return( {
            user: 'anonymous',
            isAdmin: false,
            isUser: false,
            authenticated: false,
        });
    }
    await next();
};
