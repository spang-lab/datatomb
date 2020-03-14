import fs from 'fs-extra';
import { get as getDsetstore } from '../context/dsetstore.js';

const datasetFileExists = async (ctx, hash) => {
    const dsetstore = await getDsetstore(ctx);
    const filepath = [dsetstore.path, hash].join('/');
    return fs.exists(filepath);
};

export { datasetFileExists as default };
