use crate::{
    fills_registry::fills_registry::{FillsRegistry, Fill},
    common::{
        constant::MAX_FILLS_QUEUE_SIZE,
        error::DoubleZeroError
    }
};
use anchor_lang::prelude::*;

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

    /// Updates the first entry of the queue
    pub fn update_front(&mut self, fill: Fill) -> Result<()> {
        self.fills[self.head as usize] = fill;
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
