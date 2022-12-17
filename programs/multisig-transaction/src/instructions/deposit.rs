use super::*;

/// Function to deposit the Sols
///
/// This function can throw following errors:
///   - Insufficient Funds (when wallet don't have enough balance).
pub fn deposit(ctx: Context<Deposit>, deposit_amount: u64) -> Result<()> {
    let wallet = &ctx.accounts.wallet;
    let escrow_account = &ctx.accounts.escrow_account;
    let system_program = &ctx.accounts.system_program;

    // Checking wheather wallet have sufficient lamports to deposits or not
    require!(
        wallet.to_account_info().lamports() >= deposit_amount,
        CustomError::InsufficientFunds
    );

    invoke(
        &system_instruction::transfer(&wallet.key(), &escrow_account.key(), deposit_amount),
        &[
            escrow_account.to_account_info(),
            wallet.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    /// User wallet account.
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// CHECK: Not dangerous. Account seeds will be checked in constraint.
    #[account(
        mut,
        seeds = [
            ESCROW,
            wallet.key().as_ref()
        ],
        bump
    )]
    pub escrow_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
