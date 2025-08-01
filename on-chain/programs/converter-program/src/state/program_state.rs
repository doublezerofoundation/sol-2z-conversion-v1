use anchor_lang::prelude::*;

use crate::{
    common::constant::{
        MAX_FIFO_QUEUE_SIZE_FOR_EPOCH_TAGGING,
        MAX_TRADE_HISTORY_SIZE
    },
    state::bump_registry::BumpRegistry,
    validator_deposit::epoch_chunk::EpochChunk,
    common::error::DoubleZeroError,
    common::events::system::UnauthorizedUser
};

#[account]
#[derive(InitSpace, Debug)]
pub struct ProgramStateAccount {
    pub admin: Pubkey,
    pub is_halted: bool,  // Indicates whether the system accepts conversion requests
    #[max_len(MAX_FIFO_QUEUE_SIZE_FOR_EPOCH_TAGGING)]
    pub fifo_queue: Vec<EpochChunk>,  // Used for epoch tagging
    pub bump_registry: BumpRegistry,
    #[max_len(MAX_TRADE_HISTORY_SIZE)]
    pub trade_history_list: Vec<TradeHistory>
}

impl ProgramStateAccount {
    pub fn assert_admin(&self, signer: &Signer) -> Result<()> {
        if self.admin != signer.key() {
            emit!(UnauthorizedUser { attempted_by: signer.key() });
            return err!(DoubleZeroError::UnauthorizedUser);
        }
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace)]
pub struct TradeHistory {
    pub epoch: u64,
    pub num_of_trades: u64,
}