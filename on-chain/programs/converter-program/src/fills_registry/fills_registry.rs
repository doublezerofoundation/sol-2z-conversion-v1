use crate::common::constant::MAX_FILLS_QUEUE_SIZE;
use anchor_lang::prelude::*;

#[account(zero_copy)]
pub struct FillsRegistry {
    pub total_sol_pending: u64,      // Total SOL in not dequeued fills
    pub total_2z_pending: u64,       // Total 2Z in not dequeued fills
    pub fills: [Fill; MAX_FILLS_QUEUE_SIZE],
    pub head: u64,   // index of oldest element
    pub tail: u64,   // index to insert next element
    pub count: u64,  // number of valid elements
}

#[zero_copy]
pub struct Fill {
    pub sol_in: u64,
    pub token_2z_out: u64
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DequeueFillsResult {
    pub sol_dequeued: u64,
    pub token_2z_dequeued: u64,
    pub fills_consumed: u64
}