use super::*;

/// Function to reset the contract
pub fn reset_global_state(ctx: Context<Reset>, admins: Vec<Pubkey>, threshold: u64) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    global_state.store(admins, threshold);

    Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct Reset<'info> {
    #[account(
        mut,
        seeds = [GLOBAL],
        bump,
    )]
    global_state: Box<Account<'info, GlobalState>>,

    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}
