use anchor_lang::prelude::*;

use crate::{
    common::constant::MAX_FIFO_QUEUE_SIZE_FOR_EPOCH_TAGGING,
    state::bump_registry::BumpRegistry,
    validator_deposit::epoch_chunk::EpochChunk,
};

#[account]
#[derive(InitSpace, Debug)]
pub struct ProgramStateAccount {
    pub admin: Pubkey,
    pub is_halted: bool,  // Indicates whether the system accepts conversion requests
    #[max_len(MAX_FIFO_QUEUE_SIZE_FOR_EPOCH_TAGGING)]
    pub fifo_queue: Vec<EpochChunk>,  // Used for epoch tagging
    pub bump_registry: BumpRegistry
}
