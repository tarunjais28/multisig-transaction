use super::*;

#[account]
pub struct GlobalState {
    pub admins: Vec<Pubkey>,
    pub threshold: u64,
    pub favourable_votes: u64,
    pub is_voted: bool,
}

impl GlobalState {
    pub fn store(&mut self, admins: Vec<Pubkey>, threshold: u64) {
        self.admins = admins;
        self.threshold = threshold;
        self.reset();
    }

    pub fn reset(&mut self) {
        self.favourable_votes = 0;
        self.is_voted = false;
    }
}
