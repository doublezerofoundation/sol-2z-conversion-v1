use anchor_lang::prelude::*;

#[event]
pub struct TradeEvent {
    pub sol_amount: u64,
    pub token_amount: u64,
    pub bid_price: u64,
    pub timestamp: i64,
    pub buyer: Pubkey,
    pub epoch: u64
}

#[event]
pub struct BidTooLowEvent {
    pub sol_amount: u64,
    pub bid_amount: u64,
    pub ask_price: u64,
    pub timestamp: i64,
    pub buyer: Pubkey,
    pub epoch: u64
}

