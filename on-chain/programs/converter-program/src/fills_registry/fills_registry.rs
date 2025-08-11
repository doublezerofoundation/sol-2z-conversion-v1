use crate::common::constant::{MAX_FILLS_LIST_SIZE, MAX_TRADE_HISTORY_SIZE};
use anchor_lang::prelude::*;
use crate::state::program_state::TradeHistory;

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

impl FillsRegistry {
    pub fn add_fill_to_fills_registry(
        &mut self,
        sol_in: u64,
        token_2z_out: u64,
        timestamp: i64,
        buyer: Pubkey,
        epoch: u64,
        maximum_fills_storage: usize,
    ) -> Result<()> {
        // Add it to fills registry
        let fill = Fill {
            sol_in,
            token_2z_out,
            timestamp,
            buyer,
            epoch,
        };
        
        // Check storage limits
        msg!("Fill size {}", self.fills.len());
        if self.fills.len() >= maximum_fills_storage {
            // TODO: temp fix: Clarify with clients.
            // Remove the oldest fill
            self.fills.remove(0);
        }

        // Update fills registry
        self.fills.push(fill);
        self.total_sol_pending += sol_in;
        self.total_2z_pending += token_2z_out;
        Ok(())
    }
}
