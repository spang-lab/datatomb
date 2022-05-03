import yaml from 'js-yaml';
import fs from 'fs';
import { log } from './logger.js';

const fsPromise = fs.promises;
let config = null;

export const getConfig = () => config;

const packageInfo = async () => JSON.parse(await fsPromise.readFile('package.json'));

const loadFile = async (path) => {
    const string = await fsPromise.readFile(
        path,
        'utf8',
    );
    const data = yaml.safeLoad(string);
    return data;
};

const getSecrets = () => {
    const secrets = {};
    Object.keys(process.env).forEach((key) => {
        secrets[key] = process.env[key];
    });
    return secrets;
};

const getAuthconfig = async (data) => {
    if (data.authentication.kind === 'file') {
        return {
            kind: 'file',
            users: JSON.parse(await fsPromise.readFile(data.authentication.userfile))
        };
} else if (data.authentication.kind === 'acrux') {
        return data.authentication;
    } else {
        throw new Error('Unsupported authentication method');
    }
};

export const createConfig = async () => {
    log('Loading configuration...');
    const data = await loadFile('config/config.yaml');
    const pkgInfo = await packageInfo();
    data.packageName = pkgInfo.name;
    data.packageVersion = pkgInfo.version;
    const secrets = await getSecrets();
    data.secrets = secrets;
    data.authentication = await getAuthconfig(data);
    log('Config loaded successfully');
    config = data;
    return config;
};
