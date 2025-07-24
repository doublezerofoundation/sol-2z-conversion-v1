use crate::common::constant::MAX_DENY_LIST_SIZE;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct DenyListRegistry {
    #[max_len(MAX_DENY_LIST_SIZE)]
    pub denied_addresses: Vec<Pubkey>,
    pub last_updated: i64,
    pub update_count: u64,  // For audit purposes
}