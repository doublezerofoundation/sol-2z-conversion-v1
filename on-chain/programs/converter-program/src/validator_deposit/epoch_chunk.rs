use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace)]
pub struct EpochChunk {
    pub epoch: u64,
    pub lamports: u64,
}