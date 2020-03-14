import fs from 'fs-extra';
import { log } from '../util/logger.js';

const checkIfDirIsWritable = async (dir) => {
    const file = [dir, 'testfile'].join('/');
    try {
        await fs.writeFile(file, 'this is just a test.');
    } catch (err) {
        return false;
    }
    if (await fs.exists(file)) {
        await fs.remove(file);
        return true;
    }
    return false;
};

let dsetstore = null;
export const get = async (ctx) => {
    if (ctx && ctx.dsetstore) {
        return ctx.dsetstore;
    }
    return dsetstore;
};
export const create = async (dir) => {
    try {
        await fs.ensureDir(dir);
    } catch (err) {
        log(`cannot create / access dataset directory ${dir}\n${err}\nConfigure datasetpath in config.yaml accordingly. We stop here.`);
        process.exit(1);
    }
    const isWritable = await checkIfDirIsWritable(dir);
    dsetstore = {
        path: dir,
        writable: isWritable,
    };
};
