import { getDb } from './index.js';

export const addLog = function(ctx, hash, operation) {
    console.log(`add log entry for hash: ${hash}, action: ${operation}`);
    const db = getDb();
    return db.none('INSERT INTO log(operation, who, time, dataset) VALUES($/operation/, $/user/, $/timestamp/, (SELECT MAX(id) from datasets where hash = $/hash/))',
            {
                operation: operation,
                user: ctx.state.authdata.user,
                timestamp: new Date(),
                hash: hash
            });
};
export const getLog = async function (db, hash) {
    console.log(`get log entry for hash: ${hash}`);
    return db.map('SELECT operation, who, time FROM log where dataset in (SELECT id FROM datasets WHERE hash = $1)', hash, (row) => { return { user: row.who, action: row.operation, time: row.time }; });
};
