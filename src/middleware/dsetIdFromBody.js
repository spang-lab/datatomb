export default async (ctx, next) => {
    ctx.assert(ctx.request.body.target,
        400,
        'no datasetid in body of request.');
    ctx.params.dsetid = ctx.request.body.target;
    await next();
};
