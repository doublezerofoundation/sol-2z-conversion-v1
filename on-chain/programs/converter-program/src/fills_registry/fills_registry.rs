use crate::common::{
    constant::MAX_TEMP_FILLS_QUEUE_SIZE,
    error::DoubleZeroError
};
use anchor_lang::prelude::*;

#[account(zero_copy)]
pub struct FillsRegistry {
    pub total_sol_pending: u64,      // Total SOL in not dequeued fills
    pub total_2z_pending: u64,       // Total 2Z in not dequeued fills
    pub lifetime_sol_processed: u64, // Cumulative SOL processed
    pub lifetime_2z_processed: u64,  // Cumulative 2Z processed
    pub fills: [Fill; MAX_TEMP_FILLS_QUEUE_SIZE],
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

impl FillsRegistry {
    pub fn add_trade_to_fills_registry(
        &mut self,
        sol_in: u64,
        token_2z_out: u64,
    ) -> Result<()> {
        // Add it to fills registry
        let fill = Fill {
            sol_in,
            token_2z_out,
        };

        self.enqueue(fill)?;
        self.total_sol_pending += sol_in;
        self.total_2z_pending += token_2z_out;
        Ok(())
    }

    pub fn dequeue_fills(
        &mut self,
        max_sol_amount: u64,
    ) -> Result<DequeueFillsResult> {
        let mut sol_dequeued = 0u64;
        let mut token_2z_dequeued = 0u64;
        let mut fills_consumed = 0u64;

        // Consume fills until max_sol_amount reached
        while !self.is_empty() {
            let next_fill_amount = self.peek()?.sol_in;
            // Check if adding this fill would exceed max_sol_amount
            let new_total = sol_dequeued.checked_add(next_fill_amount)
                .ok_or(DoubleZeroError::ArithmeticError)?;

            if new_total > max_sol_amount { break; }

            let fill = self.dequeue()?;
            sol_dequeued += fill.sol_in;
            token_2z_dequeued += fill.token_2z_out;
            fills_consumed += 1;
        }

        // Update registry statistics
        self.total_sol_pending -= sol_dequeued;
        self.total_2z_pending -= token_2z_dequeued;
        self.lifetime_sol_processed += sol_dequeued;
        self.lifetime_2z_processed += token_2z_dequeued;

        Ok(DequeueFillsResult {
            sol_dequeued,
            token_2z_dequeued,
            fills_consumed,
        })
    }

}
