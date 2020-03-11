export default async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        const message = err.toString();
        ctx.body = {
            ok: false,
            error: message,
        };
    }
};
