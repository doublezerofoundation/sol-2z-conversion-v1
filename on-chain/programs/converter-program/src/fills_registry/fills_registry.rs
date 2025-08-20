use crate::common::{
    constant::MAX_FILLS_QUEUE_SIZE,
    error::DoubleZeroError
};
use anchor_lang::prelude::*;

#[account(zero_copy)]
pub struct FillsRegistry {
    pub total_sol_pending: u64,      // Total SOL in not dequeued fills
    pub total_2z_pending: u64,       // Total 2Z in not dequeued fills
    pub lifetime_sol_processed: u64, // Cumulative SOL processed
    pub lifetime_2z_processed: u64,  // Cumulative 2Z processed
    pub fills: [Fill; MAX_FILLS_QUEUE_SIZE],
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
    // Data Structure Implementation - Solana does not have implementation for queue
    /// Adds it to Queue
    pub fn enqueue(&mut self, fill: Fill) -> Result<()> {
        if self.count as usize >= MAX_FILLS_QUEUE_SIZE {
            return err!(DoubleZeroError::RegistryFull);
        }
        self.fills[self.tail as usize] = fill;
        self.tail = (self.tail + 1) % MAX_FILLS_QUEUE_SIZE as u64;
        self.count += 1;
        Ok(())
    }

    /// Remove & Return the old entry - FIFO
    pub fn dequeue(&mut self) -> Result<Fill> {
        require!(!self.is_empty(), DoubleZeroError::RegistryEmpty);
        let fill = self.fills[self.head as usize]; // copy the Fill (Fill is Copy)
        self.head = (self.head + 1) % MAX_FILLS_QUEUE_SIZE as u64;
        self.count -= 1;
        Ok(fill)
    }

    /// Return the old entry - FIFO : Does Not Remove
    pub fn peek(&self) -> Result<&Fill> {
        require!(!self.is_empty(), DoubleZeroError::RegistryEmpty);
        let fill = &self.fills[self.head as usize];
        Ok(fill)
    }

    /// Updates the first entry of the queue
    pub fn update_front(&mut self, fill: Fill) -> Result<()> {
        self.fills[self.head as usize] = fill;
        Ok(())
    }

    /// Checks whether the queue is empty
    pub fn is_empty(&self) -> bool {
        self.count == 0
    }
}
