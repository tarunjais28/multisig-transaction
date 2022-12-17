use super::*;

/// Function to cast vote for the transaction to happen
///
/// This function can throw following errors:
///   - Vote Already Casted (when council members have already casted the vote).
///   - Not All Voters (when all council members did not casted the vote).
///   - Outsider Vote (when someone outside the counsil also vote)
pub fn cast_vote(ctx: Context<CastVote>, votings: Proposals) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;

    // Checking wheather the vote is already casted or not
    require!(!global_state.is_voted, CustomError::VoteAlreadyCasted);

    // Checking wheather all admins voted for the proposals
    let matching = global_state
        .admins
        .iter()
        .zip(votings.proposals.iter())
        .filter(|&(admin, proposal)| admin == &proposal.admin)
        .count();

    require!(
        matching == global_state.admins.len(),
        CustomError::NotAllVoters
    );

    // Ensuring only council members voted
    require!(
        matching == votings.proposals.len(),
        CustomError::OutsiderVote
    );

    global_state.favourable_votes = votings
        .proposals
        .iter()
        .filter(|&proposal| proposal.can_withdraw)
        .count() as u64;

    global_state.is_voted = true;

    Ok(())
}

#[derive(Accounts)]
#[instruction()]
pub struct CastVote<'info> {
    #[account(
        mut,
        seeds = [GLOBAL],
        bump,
    )]
    global_state: Box<Account<'info, GlobalState>>,

    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}
