import fetch from 'node-fetch';
import LRU from 'lru-cache';

import {
    log,
} from './logger.js';

const isInGroup = (userdata, groupname) => {
    const res = userdata.grouplist.find((g) => (g === groupname));
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
        const userinfourl = `${url}/user/info`;

        log(`contacting authserver ${userinfourl}`);
        const response = await fetch(userinfourl, {
            method: 'get',
            headers: {
                Authorization: authtoken,
            },
        }).then((res) => res.json());

        if (typeof response.ok !== 'undefined' && !response.ok) {
            if (response.error) {
                throw new Error(`authserver returned: ${response.error}`);
            } else {
                throw new Error('authserver returned generic error.');
            }
        }
        const userdata = response.data;

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
