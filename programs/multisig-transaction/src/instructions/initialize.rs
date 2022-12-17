use super::*;

/// Function to initialize the contract with set of owners and thresold value
pub fn initialize(ctx: Context<Initialize>, owners: PublicKeys, threshold: u64) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    global_state.save(owners, threshold);

    Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct Initialize<'info> {
    #[account(zero)]
    global_state: Account<'info, GlobalState>,
}
