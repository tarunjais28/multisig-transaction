use crate::{instructions::*, states::*, types::*};
use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::instruction::Instruction;
use std::convert::Into;

mod instructions;
mod states;
mod types;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod multisig_transaction {
    use super::*;

    /// Initialization
    pub fn initialize(ctx: Context<Initialize>, admins: PublicKeys, threshold: u64) -> Result<()> {
        instructions::initialize(ctx, admins, threshold)
    }
}
