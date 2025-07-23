use crate::common::constant::MAX_FILLS_LIST_SIZE;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct FillsRegistry {
    #[max_len(MAX_FILLS_LIST_SIZE)]
    fills: Vec<Fill>,
    total_sol_pending: u64,      // Total SOL in not dequeued fills
    total_2z_pending: u64,       // Total 2Z in not dequeued fills
    lifetime_sol_processed: u64, // Cumulative SOL processed
    lifetime_2z_processed: u64,  // Cumulative 2Z processed
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace)]
pub struct Fill {
    sol_in: u64,
    token_2z_out: u64,
    timestamp: i64,
    buyer: Pubkey,
    epoch: u64, // Source epoch for accounting
}