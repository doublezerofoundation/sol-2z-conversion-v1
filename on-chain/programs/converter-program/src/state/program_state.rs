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

    pub fn update_trade_history(
        &mut self,
        epoch: u64,
        sol_amount: u64,
    ) -> Result<()> {
        if let Some(entry) = self.trade_history_list
            .iter_mut().find(|t| t.epoch == epoch) {
                entry.num_of_trades += 1;
                entry.amount_of_sol += sol_amount;
        } else {
            // Add a new entry if not found

            // Check storage limits
            msg!("Trade History List size {}", self.trade_history_list.len());
            if self.trade_history_list.len() >= MAX_TRADE_HISTORY_SIZE as usize {
                self.trade_history_list.remove(0);
            }

            self.trade_history_list.push(TradeHistory {
                epoch,
                num_of_trades: 1,
                amount_of_sol: sol_amount,
            });
        }
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace)]
pub struct TradeHistory {
    pub epoch: u64,
    pub num_of_trades: u64,
    pub amount_of_sol: u64,
}