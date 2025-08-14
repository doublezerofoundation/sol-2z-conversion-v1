// max sizes of Vec
// TODO: confirm with the clients
pub const MAX_AUTHORIZED_DEQUEUERS: u64 = 20;
pub const MAX_DENY_LIST_SIZE: u64 = 50;
pub const MAX_FILLS_QUEUE_SIZE: usize = 159;
pub const MAX_TEMP_FILLS_QUEUE_SIZE: usize = 150000;

/// Decimal precision for basis points
pub const DECIMAL_PRECISION: u64 = 100;

/// 2Z Token decimals
pub const TOKEN_DECIMALS: u64 = 1_000_000;

// Account Size
pub const DISCRIMINATOR_SIZE: usize = 8;