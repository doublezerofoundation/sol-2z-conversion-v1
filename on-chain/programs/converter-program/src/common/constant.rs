// Max sizes of vectors.
pub const MAX_DENY_LIST_SIZE: u64 = 310;
pub const MAX_FILLS_QUEUE_SIZE: usize = 650000;

/// Decimal precision for basis points.
pub const BPS: u16 = 100;

/// 2Z token decimals.
pub const TOKEN_DECIMALS: u8 = 8;
pub const TOKEN_UNITS: u64 = 10u64.pow(TOKEN_DECIMALS as u32);

// Account size.
pub const DISCRIMINATOR_SIZE: usize = 8;