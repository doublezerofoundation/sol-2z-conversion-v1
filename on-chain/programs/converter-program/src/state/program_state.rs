use anchor_lang::prelude::*;

use crate::{
    common::constant::MAX_TRADE_HISTORY_SIZE,
    state::bump_registry::BumpRegistry,
    common::error::DoubleZeroError,
    common::events::system::UnauthorizedUser
};

#[account]
#[derive(InitSpace, Debug)]
pub struct ProgramStateAccount {
    pub admin: Pubkey,
    pub is_halted: bool,  // Indicates whether the system accepts conversion requests
    pub bump_registry: BumpRegistry,
    #[max_len(MAX_TRADE_HISTORY_SIZE)]
    pub trade_history_list: Vec<TradeHistory>,
}

impl ProgramStateAccount {
    pub fn assert_admin(&self, signer: &Signer) -> Result<()> {
        if self.admin != signer.key() {
            emit!(UnauthorizedUser { attempted_by: signer.key() });
            return err!(DoubleZeroError::UnauthorizedAdmin);
        }
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace)]
pub struct TradeHistory {
    pub epoch: u64,
    pub num_of_trades: u64,
}