use super::*;

#[account]
pub struct GlobalState {
    pub admins: PublicKeys,
    pub threshold: usize,
    pub favourable_votes: usize,
    pub is_voted: bool,
}

impl GlobalState {
    pub fn store(&mut self, admins: PublicKeys, threshold: usize) {
        self.admins = admins;
        self.threshold = threshold;
        self.reset();
    }

    pub fn reset(&mut self) {
        self.favourable_votes = 0;
        self.is_voted = false;
    }
}
