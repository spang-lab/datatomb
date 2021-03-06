export default async (ctx, next) => {
    ctx.assert(ctx.state.authdata,
        500,
        'no authdata in context');
    ctx.assert(ctx.state.authdata.isAdmin,
        401,
        'only available to admin users.');

    await next();
};
