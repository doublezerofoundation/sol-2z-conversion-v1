use crate::validator_deposit::epoch_chunk::EpochChunk;
use crate::common::constant::MAX_FIFO_QUEUE_SIZE_FOR_EPOCH_TAGGING;
use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace, Debug)]
pub struct ProgramState {
    admin: Pubkey,
    is_halted: bool,  // Indicates whether the system accepts conversion requests
    #[max_len(MAX_FIFO_QUEUE_SIZE_FOR_EPOCH_TAGGING)]
    fifo_queue: Vec<EpochChunk>,  // Used for epoch tagging
}

