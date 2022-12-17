use super::*;

#[account]
pub struct GlobalState {
    pub admins: PublicKeys,
    pub threshold: u64,
}

impl GlobalState {
    pub fn save(&mut self, owners: PublicKeys, threshold: u64) {
        self.admins = owners;
        self.threshold = threshold;
    }
}
