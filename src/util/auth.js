import fetch from 'node-fetch';
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
export default async (authserverconfig, authtoken) => {
    if (authtoken) {
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

        return ({
            user: userdata.sub,
            isAdmin: isInGroup(userdata, admingroup),
            isUser: isInGroup(userdata, usergroup),
            authenticated: true,
        });
    }
    return ({
        user: 'anonymous',
        isAdmin: false,
        isUser: false,
        authenticated: false,
    });
};
