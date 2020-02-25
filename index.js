import { server } from "./src/index.js";

( async () => {
    try {
        await server();
    } catch ( err ) {
        console.error(err);
    };

} )();
