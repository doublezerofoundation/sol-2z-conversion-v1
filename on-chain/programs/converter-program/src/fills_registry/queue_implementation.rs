use crate::common::constant::MAX_FILLS_QUEUE_SIZE;
use crate::fills_registry::fills_registry::{FillsRegistry, Fill};
use anchor_lang::prelude::*;

#[error_code]
pub enum FillRegistryError {
    #[msg("FillsRegistry is full — cannot enqueue.")]
    RegistryFull,
    #[msg("FillsRegistry is empty — cannot dequeue.")]
    RegistryEmpty,
}
impl FillsRegistry {

    // Data Structure Implementation - Solana does not have implementation for queue

    /// Adds it to Queue
    pub fn enqueue(&mut self, fill: Fill) -> Result<()> {
        require!(!self.is_full(), FillRegistryError::RegistryFull);

        if self.fills.len() < MAX_FILLS_QUEUE_SIZE {
            self.fills.push(fill); // extend Vec if space
        } else {
            self.fills[self.tail as usize] = fill; // overwrite existing slot
        }

        self.tail = (self.tail + 1) % MAX_FILLS_QUEUE_SIZE as u32;
        self.count += 1;
        Ok(())
    }

    /// Remove & Return the old entry - FIFO
    pub fn dequeue(&mut self) -> Result<Fill> {
        require!(!self.is_empty(), FillRegistryError::RegistryEmpty);
        let fill = self.fills[self.head as usize];
        self.head = (self.head + 1) % MAX_FILLS_QUEUE_SIZE as u32;
        self.count -= 1;
        Ok(fill)
    }

    /// Return the old entry - FIFO : Does Not Remove
    pub fn peek(&self) -> Result<&Fill> {
        require!(!self.is_empty(), FillRegistryError::RegistryEmpty);
        let fill = &self.fills[self.head as usize];
        Ok(fill)
    }

    /// Checks whether the queue is empty
    pub fn is_empty(&self) -> bool {
        self.count == 0
    }

    /// Checks whether the queue is full
    fn is_full(&self) -> bool {
        self.count as usize >= MAX_FILLS_QUEUE_SIZE
    }
}