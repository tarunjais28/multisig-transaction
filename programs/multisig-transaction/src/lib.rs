use crate::{constants::*, instructions::*, states::*, types::*};
use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_instruction},
};
use std::convert::Into;
mod constants;
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

    /// Deposit Sols
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit(ctx, amount)
    }
}
