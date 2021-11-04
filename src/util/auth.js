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
        const userinfourl = `${url}/user/info`;

        log(`contacting authserver ${userinfourl}`);
        const userdata = await fetch(userinfourl, {
            method: 'get',
            headers: {
                Authorization: authtoken,
            },
        }).then((res) => res.json());

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
