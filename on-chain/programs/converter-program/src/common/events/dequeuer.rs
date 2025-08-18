use anchor_lang::prelude::*;

#[event]
pub struct DequeuerAdded {
    pub added_by: Pubkey,
    pub dequeuer: Pubkey,
}

#[event]
pub struct DequeuerRemoved {
    pub removed_by: Pubkey,
    pub dequeuer: Pubkey,
}

#[event]
pub struct FillsDequeuedEvent {
    pub requester: Pubkey,
    pub sol_dequeued: u64,
    pub token_2z_dequeued: u64,
    pub fills_consumed: u64,
    pub timestamp: i64
}

