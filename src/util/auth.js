import fetch from 'node-fetch';
import LRU from 'lru-cache';

import {
    log,
} from './logger.js';

const isInGroup = (userdata, groupname) => {
    const res = userdata.groups.find((g) => (g.name === groupname));
    if (res) {
        return true;
    }
    return (false);
};

const authcache = new LRU({
    max: 500, // not really important, but to avoid oom safety issues, we should cap this.
    maxAge: 5 * 60 * 1000, // authentication remains valid for 5 minutes.
    updateAgeOnGet: false,
});

export default async (authserverconfig, authtoken) => {
    if (authtoken) {
        if (authcache.has(authtoken)) {
            const authdata = authcache.get(authtoken);
            log(`user ${authdata.user} authenticated (cached)`);
            return authcache.get(authtoken);
        }
        const { url, usergroup, admingroup } = authserverconfig;

        log(`contacting authserver ${url}`);
        const userdataPromise = fetch(url, {
            method: 'post',
            body: JSON.stringify({ token: authtoken }),
            headers: { 'Content-Type': 'application/json' },
        }).then((res) => res.json());

        const userdata = await userdataPromise;

        if (typeof userdata.ok !== 'undefined' && !userdata.ok) {
            if (userdata.error) {
                throw new Error(`authserver returned: ${userdata.error}`);
            } else {
                throw new Error('authserver returned generic error.');
            }
        }

        log(`user ${userdata.sub} authenticated.`);

        const authinfo = {
            user: userdata.sub,
            isAdmin: isInGroup(userdata, admingroup),
            isUser: isInGroup(userdata, usergroup),
            authenticated: true,
        };
        authcache.set(authtoken, authinfo);

        return (authinfo);
    }
    return ({
        user: 'anonymous',
        isAdmin: false,
        isUser: false,
        authenticated: false,
    });
};
