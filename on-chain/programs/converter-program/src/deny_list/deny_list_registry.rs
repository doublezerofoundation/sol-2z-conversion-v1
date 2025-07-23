use crate::common::constant::MAX_DENY_LIST_SIZE;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct DenyListRegistry {
    #[max_len(MAX_DENY_LIST_SIZE)]
    denied_addresses: Vec<Pubkey>,
    last_updated: i64,
    update_count: u64,  // For audit purposes
}