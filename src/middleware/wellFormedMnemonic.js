// check that the mnemonic in the context obeys the naming rules.

export default async (ctx, next) => {
    // silently convert to lower case
    ctx.params.mnemonic = ctx.params.mnemonic.toLowerCase();
    const { mnemonic } = ctx.params;
    ctx.assert(mnemonic,
               500,
               'no mnemonic in context.');
    const mnemonicRe = new RegExp("[a-z_]+");
    ctx.assert(mnemonicRe.exec(mnemonic),
               400,
               'invalid mnemonic name');
    await next();
};
