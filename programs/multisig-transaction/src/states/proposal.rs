use super::*;

#[account]
pub struct Proposals {
    pub proposals: Vec<Proposal>,
}

#[account]
pub struct Proposal {
    pub admin: Pubkey,
    pub can_withdraw: bool,
}
