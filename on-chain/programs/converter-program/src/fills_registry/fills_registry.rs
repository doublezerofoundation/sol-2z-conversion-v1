use crate::common::constant::MAX_FILLS_LIST_SIZE;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct FillsRegistry {
    #[max_len(MAX_FILLS_LIST_SIZE)]
    pub fills: Vec<Fill>,
    pub total_sol_pending: u64,      // Total SOL in not dequeued fills
    pub total_2z_pending: u64,       // Total 2Z in not dequeued fills
    pub lifetime_sol_processed: u64, // Cumulative SOL processed
    pub lifetime_2z_processed: u64,  // Cumulative 2Z processed
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace)]
pub struct Fill {
    pub sol_in: u64,
    pub token_2z_out: u64,
    pub timestamp: i64,
    pub buyer: Pubkey,
    pub epoch: u64, // Source epoch for accounting
}