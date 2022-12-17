use super::*;

#[error_code]
pub enum CustomError {
    #[msg("Not all admins voted for the proposals.")]
    NotAllVoters,

    #[msg("Minimum threshold for transaction not met.")]
    ThresholdNotMet,

    #[msg("Vote is already casted.")]
    VoteAlreadyCasted,

    #[msg("Balance is not enough.")]
    InsufficientFunds,

    #[msg("Someone outside the council voted.")]
    OutsiderVote,
}
