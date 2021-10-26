// import { log } from '../util/index.js';

export const aliasExists = async (db, name) => {
    const result = await db.oneOrNone('SELECT hash FROM aliases WHERE alias = $/name/ ORDER BY id DESC LIMIT 1;', { name });
    return (result.hash !== null);
};
export const aliasExistedAtTime = async (db, name, time) => {
    const result = await db.oneOrNone('SELECT hash FROM aliases WHERE alias = $/name/ AND time < $/time/ ORDER BY id DESC LIMIT 1;', { name, time });
    return (result.hash !== null);
};

export const insertAlias = async (db, name, to, owner) => db.none(
    'INSERT INTO aliases(alias,hash,owner,time) VALUES($/name/,$/to/,$/owner/,NOW());',
    { name, to, owner },
);

export const getAlias = async (db, name) => db.oneOrNone('SELECT alias,hash,owner FROM aliases WHERE alias = $/name/ AND hash IS NOT NULL ORDER BY id DESC LIMIT 1;', { name });

export const getAliasAtTime = async (db, name, time) => db.oneOrNone('SELECT alias,hash,owner FROM aliases WHERE alias = $/name/ AND time < $/time/ ORDER BY id DESC LIMIT 1;', { name, time });

export const deleteAlias = async (db, name, owner) => insertAlias(db, name, null, owner);

// this will also return deleted aliases!
export const allReverseAliases = async(db, hash) => db.map('SELECT alias FROM aliases WHERE hash = $/hash/;', { hash }, (result) => result.alias);
