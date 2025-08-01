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
