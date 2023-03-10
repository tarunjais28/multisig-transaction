use super::*;

/// Function to initialize the contract with set of owners and thresold value
pub fn initialize(ctx: Context<Initialize>, admins: Vec<Pubkey>, threshold: u64) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    global_state.store(admins, threshold);

    Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [GLOBAL],
        bump,
        payer = authority,
        space = 1024
    )]
    global_state: Box<Account<'info, GlobalState>>,

    #[account(mut)]
    authority: Signer<'info>,

    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}
