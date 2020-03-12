import { getDb, addLog, dsetExistsInDb } from '../database/index.js';
import {get as getDsetstore} from '../context/dsetstore.js';
import fs from 'fs-extra';

export const datasetExists = async (ctx, hash) => {
    const db = getDb();
    const metadataExists = dsetExistsInDb(db, hash);
    const dsetstore = await getDsetstore(ctx);
    const filepath = [dsetstore.path, hash].join('/');
    const fileExists = fs.exists(filepath);
    return (await metadataExists) & (await fileExists);
};
