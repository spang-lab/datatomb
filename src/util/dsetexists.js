import { getDb, addLog, dsetExistsInDb } from '../database/index.js';
import {get as getDsetstore} from '../context/dsetstore.js';
import fs from 'fs-extra';

export const datasetFileExists = async(ctx, hash) => {
    const dsetstore = await getDsetstore(ctx);
    const filepath = [dsetstore.path, hash].join('/');
    return fs.exists(filepath);
}
export const datasetExists = async (ctx, hash) => {
    const db = getDb();
    const metadataExists = dsetExistsInDb(db, hash);
    return (await metadataExists) & (await datasetFileExists(ctx, hash));
};
