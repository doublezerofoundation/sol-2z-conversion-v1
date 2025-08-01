use anchor_lang::prelude::*;

#[event]
pub struct TradeEvent {
    pub sol_amount: u64,
    pub token_amount: u64,
    pub timestamp: i64,
    pub buyer: Pubkey,
    pub epoch: u64
}

