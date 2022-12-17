use crate::{constants::*, errors::*, instructions::*, states::*};
use anchor_lang::{
    prelude::*,
    solana_program::{
        program::{invoke, invoke_signed},
        system_instruction,
    },
};
use std::convert::Into;
mod constants;
mod errors;
mod instructions;
mod states;

declare_id!("B5Df1ZgqTsUZPjezozfoYm1snbFtiP2uVJCspyWuNeGG");

#[program]
pub mod multisig_transaction {
    use super::*;

    /// Initialization
    pub fn initialize(ctx: Context<Initialize>, admins: Vec<Pubkey>, threshold: u64) -> Result<()> {
        instructions::initialize(ctx, admins, threshold)
    }

    /// Deposit Sols
    pub fn deposit(ctx: Context<Deposit>, deposit_amount: u64) -> Result<()> {
        instructions::deposit(ctx, deposit_amount)
    }

    /// Council for casting vote for the transaction
    pub fn council(ctx: Context<CastVote>, votings: Proposals) -> Result<()> {
        instructions::cast_vote(ctx, votings)
    }

    /// Withdraw Sols
    pub fn withdraw(ctx: Context<Withdraw>, withdrawal_amount: u64) -> Result<()> {
        instructions::withdraw(ctx, withdrawal_amount)
    }

    /// Reseting Global State
    pub fn reset_global_state(
        ctx: Context<Reset>,
        admins: Vec<Pubkey>,
        threshold: u64,
    ) -> Result<()> {
        instructions::reset_global_state(ctx, admins, threshold)
    }
}
