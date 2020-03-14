import { log } from '../util/index.js';

export const addLog = (db, hash, user, operation) => {
    log(`add log entry for hash: ${hash}, action: ${operation}`);
    return db.none('INSERT INTO log(operation, who, time, dataset) VALUES($/operation/, $/user/, $/timestamp/, (SELECT MAX(id) from datasets where hash = $/hash/))',
        {
            operation,
            user,
            timestamp: new Date(),
            hash,
        });
};
export const getLog = async (db, hash) => {
    log(`get log entry for hash: ${hash}`);
    return db.map('SELECT operation, who, time FROM log where dataset in (SELECT id FROM datasets WHERE hash = $1)', hash, (row) => ({ user: row.who, action: row.operation, time: row.time }));
};
