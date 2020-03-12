import fs from 'fs-extra';
import {log} from '../util/index.js';

const checkIfDirIsWritable = async (dir) => {
    let file=[dir, "testfile"].join("/");
    try {
        await fs.writeFile(file, "this is just a test.");
        log('written test file');
    } catch (err) {
        log('return false (1)');
        return false;
    }
    if( await fs.exists(file) ) {
        await fs.remove(file);
        log('removed file');
        return true;
    } else {
        log('return false (2)');
        return false;
    }
};

let dsetstore = null;
export const get = async (ctx) => {
    if( ctx && ctx.dsetstore ){
        return ctx.dsetstore;
    }
    return dsetstore;
}
export const create = async(dir) => {
    log("create dset store.");
    try {
        await fs.ensureDir(dir);
    } catch( err ) {
        log("cannot create / access dataset directory "+dir+"\n"+err+"\nConfigure datasetpath in config.yaml accordingly. We stop here.");
        process.exit(1);
    }
    const isWritable = await checkIfDirIsWritable(dir);
    dsetstore = { path: dir,
                  writable: isWritable
                };
};
