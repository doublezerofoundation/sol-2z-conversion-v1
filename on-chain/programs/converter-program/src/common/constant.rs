// max sizes of Vec
pub const MAX_AUTHORIZED_DEQUEUERS: u64 = 20;
pub const MAX_DENY_LIST_SIZE: u64 = 50;
pub const MAX_FILLS_QUEUE_SIZE: usize = 650000; //depends on account size

/// Decimal precision for basis points
pub const DECIMAL_PRECISION: u64 = 100;

/// 2Z Token decimals
pub const TOKEN_DECIMALS: u64 = 1_000_000;

// Account Size
pub const DISCRIMINATOR_SIZE: usize = 8;

// TTL value for oracle price data (in seconds)
pub const TTL: i64 = 300;