use super::*;

/// Function to withdraw the Sols
///  
/// This function can throw following errors:
///   - Insufficient Funds (when escrow account don't have enough balance).
///   - Threshold Not Met (when minimum admins didn't sign the transaction).
pub fn withdraw(ctx: Context<Withdraw>, withdrawal_amount: u64) -> Result<()> {
    let wallet = &ctx.accounts.wallet;
    let escrow_account = &ctx.accounts.escrow_account;
    let system_program = &ctx.accounts.system_program;
    let global_state = &ctx.accounts.global_state;

    let wallet_key = wallet.key();

    // Check unstake status
    require!(
        escrow_account.to_account_info().lamports() >= withdrawal_amount,
        CustomError::InsufficientFunds
    );

    // Checking transaction
    require!(
        global_state.threshold <= global_state.favourable_votes,
        CustomError::ThresholdNotMet
    );

    let escrow_seeds = [
        ESCROW,
        wallet_key.as_ref(),
        &[bump(&[ESCROW, wallet_key.as_ref()], ctx.program_id)],
    ];

    invoke_signed(
        &system_instruction::transfer(&escrow_account.key(), &wallet.key(), withdrawal_amount),
        &[
            escrow_account.to_account_info(),
            wallet.to_account_info(),
            system_program.to_account_info(),
        ],
        &[&escrow_seeds],
    )?;

    Ok(())
}

fn bump(seeds: &[&[u8]], program_id: &Pubkey) -> u8 {
    let (_, bump) = Pubkey::find_program_address(seeds, program_id);
    bump
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        seeds = [GLOBAL],
        bump,
    )]
    global_state: Box<Account<'info, GlobalState>>,

    /// User wallet account.
    #[account(mut)]
    wallet: Signer<'info>,

    /// CHECK: Not dangerous. Account seeds will be checked in constraint.
    #[account(
        mut,
        seeds = [
            ESCROW,
            wallet.key().as_ref()
        ],
        bump
    )]
    escrow_account: UncheckedAccount<'info>,

    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}
