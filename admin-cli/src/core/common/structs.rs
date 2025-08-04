use anchor_client::{
    anchor_lang::prelude::{borsh::BorshDeserialize, *},
    solana_sdk::pubkey::Pubkey,
};

#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct ConfigurationRegistryInput {
    pub oracle_pubkey: Option<Pubkey>,
    pub sol_quantity: Option<u64>,
    pub slot_threshold: Option<u64>,
    pub price_maximum_age: Option<i64>,
    pub max_fills_storage: Option<u64>,
    pub steepness: Option<u64>,
    pub max_discount_rate: Option<u64>,
}

#[allow(dead_code)]
#[derive(Debug, AnchorDeserialize)]
pub struct ConfigurationRegistry {
    pub oracle_pubkey: Pubkey,
    pub sol_quantity: u64,
    pub slot_threshold: u64,
    pub price_maximum_age: i64,
    pub max_fills_storage: u64,
    pub authorized_dequeuers: Vec<Pubkey>,
    pub steepness: u64,
    pub max_discount_rate: u64,
}

impl AccountDeserialize for ConfigurationRegistry {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        *buf = &buf[8..];
        ConfigurationRegistry::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        ConfigurationRegistry::deserialize(buf).map_err(Into::into)
    }
}
