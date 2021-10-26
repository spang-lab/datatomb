// import { log } from '../util/index.js';

export const aliasExists = async (db, name) => {
    const result = await db.oneOrNone('SELECT hash FROM aliases WHERE alias = $/name/ ORDER BY id DESC LIMIT 1;', { name });
    return (result !== null);
};

export const insertAlias = async (db, name, to, owner) => db.none(
    'INSERT INTO aliases(alias,hash,owner,time) VALUES($/name/,$/to/,$/owner/,NOW());',
    { name, to, owner },
);

export const getAlias = async (db, name) => db.oneOrNone('SELECT hash FROM aliases WHERE alias = $/name/ ORDER BY id DESC LIMIT 1;', { name })

export const deleteAlias = async (db, name, owner) => insertAlias(db, name, null, owner);
