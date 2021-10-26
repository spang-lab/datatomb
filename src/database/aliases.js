// import { log } from '../util/index.js';

export const aliasExists = async (db, name) => {
    const result = await db.oneOrNone('SELECT hash FROM aliases WHERE alias = $/name/ ORDER BY id DESC LIMIT 1;', { name });
    return (result !== null);
};

export const newAlias = async (db, name, to, owner) => db.none(
    'INSERT INTO aliases(alias,hash,owner,time) VALUES($/name/,$/to/,$/owner/,NOW());',
    { name, hash: to, owner },
);
