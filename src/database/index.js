import createDatabase from './init.js';
export { getLog, addLog } from './log.js';
export { exists as dsetExistsInDb,
         get as getMetadata,
         getCreator,
         getShareState,
         mayRead,
         add as addDatasetToDb } from './datasets.js';

let db = null;

export const getDb = (ctx) => {
    if (ctx && ctx.state.db) {
        return ctx.state.db;
    }
    if( ! db ) {
        throw 'db not created';
    }
    return db;
};
export const createDb = async () => {
    db = await createDatabase();
};
