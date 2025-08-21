use anchor_lang::prelude::*;

#[event]
pub struct FillsConsumerChanged {
    pub changed_by: Pubkey,
    pub new_consumer: Pubkey,
}

#[event]
pub struct FillsDequeued {
    pub requester: Pubkey,
    pub sol_dequeued: u64,
    pub token_2z_dequeued: u64,
    pub fills_consumed: u64,
    pub timestamp: i64
}

