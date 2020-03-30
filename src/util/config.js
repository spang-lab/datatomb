import yaml from 'js-yaml';
import fs from 'fs';
import { log } from './logger.js';

const fsPromise = fs.promises;
let config = null;

export const getConfig = () => config;


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

export const createConfig = async () => {
    log('Loading configuration...');
    const data = await loadFile('config/config.yaml');
    const secrets = await getSecrets();
    data.secrets = secrets;
    log('Config loaded successfully');
    config = data;
    return config;
};
