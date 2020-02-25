/* eslint-disable no-console */
import { server } from './src/index.js';
import config from './src/util/config.js';

(async () => {
    try {
        console.log(config);
        await server(config.Server.Port);
    } catch (err) {
        console.error(err);
    }
})();
