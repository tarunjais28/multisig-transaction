use super::*;

#[account]
pub struct Proposals {
    pub proposals: Vec<Proposal>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Proposal {
    pub admin: Pubkey,
    pub can_withdraw: bool,
}
