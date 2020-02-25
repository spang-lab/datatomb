/* eslint-disable no-console */
import { server } from './src/index.js';
import yaml from 'js-yaml';
import fs from 'fs';

(async () => {
    try {
        const config = yaml.safeLoad(fs.readFileSync('./config.yaml', 'utf8'));
        console.log(config);
        await server(config.Server.Port);
    } catch (err) {
        console.error(err);
    }
})();
