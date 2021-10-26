import { log } from '../util/index.js';
import { deleteAlias as dbDeleteAlias,
         insertAlias, getDb } from '../database/index.js';

export const addAlias = async (ctx) => {
    const { mnemonic, hash } = ctx.params;
    const { user } = ctx.state.authdata;

    log(`addAlias: ${mnemonic}, ${hash}, ${user}`);
    await insertAlias(getDb(), mnemonic, hash, user);

    ctx.body = {
        alias: mnemonic,
        hash,
        action: 'created',
    };
};

export const deleteAlias = async (ctx) => {
    log('delete alias');
    const { mnemonic } = ctx.params;
    const { user } = ctx.state.authdata;
    await dbDeleteAlias(getDb(), mnemonic, user);
    ctx.body = {
        alias: mnemonic,
        action: 'deleted',
    };
};
