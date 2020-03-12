export default async (ctx, next) => {
    // TODO: fill with actual auth data.
    ctx.state.authdata = {
        user: 'testuser'
    };
    await next();
};
