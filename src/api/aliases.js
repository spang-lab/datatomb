import { log } from '../util/index.js';
import {
    deleteAlias as dbDeleteAlias,
    getAlias as dbGetAlias,
    getAliasAtTime as dbGetAliasAtTime,
    mayRead,
    insertAlias,
    allReverseAliases,
    existingReverseAliases,
    aliasExistedAtTime,
    getDb,
} from '../database/index.js';

export const addAlias = async (ctx) => {
    const { mnemonic, hash } = ctx.params;
    const { user } = ctx.state.authdata;

    log(`add or update alias: ${mnemonic} to ${hash} by ${user}`);
    await insertAlias(getDb(), mnemonic, hash, user);

    ctx.body = {
        alias: mnemonic,
        hash,
        action: 'created',
    };
};

export const deleteAlias = async (ctx) => {
    const { mnemonic } = ctx.params;
    log(`delete alias ${mnemonic}`);
    const { user } = ctx.state.authdata;
    await dbDeleteAlias(getDb(), mnemonic, user);
    ctx.body = {
        alias: mnemonic,
        action: 'deleted',
    };
};

export const getAlias = async (ctx) => {
    const { mnemonic } = ctx.params;
    log(`get alias ${mnemonic}`);
    const { time } = ctx.state;
    const db = getDb();
    log(time);
    const { alias, hash, owner } = (time)
        ? await dbGetAliasAtTime(db, mnemonic, time)
        : await dbGetAlias(db, mnemonic);
    if (!await mayRead(db, ctx.state.authdata, hash)) {
        // people who may not read the hash may also not resolve the alias
        ctx.throw(401, 'unauthorized read.');
    }
    ctx.body = {
        alias,
        hash,
        owner,
    };
};

export const reverseAlias = async (ctx) => {
    const { hash } = ctx.params;
    const { time } = ctx.state;
    const db = getDb();
    log(`reverse lookup of hash ${hash}.`);
    if (time) {
        log(`reverse aliases at ${time}`);
        const allAliases = await allReverseAliases(db, hash);
        const exists = await Promise.all(allAliases.map(
            async (alias) => aliasExistedAtTime(db, alias, time),
        ));
        ctx.body = allAliases.filter((_, index) => exists[index]);
    } else {
        log('current reverse aliases');
        ctx.body = await existingReverseAliases(db, hash);
    }
};
