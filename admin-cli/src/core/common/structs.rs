use anchor_client::{
    anchor_lang::prelude::{borsh::BorshDeserialize, *},
    solana_sdk::pubkey::Pubkey,
};

#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct ConfigurationRegistryInput {
    pub oracle_pubkey: Option<Pubkey>,
    pub sol_quantity: Option<u64>,
    pub slot_threshold: Option<u64>,
    pub price_maximum_age: Option<u64>,
    pub max_fills_storage: Option<u64>,
}

#[allow(dead_code)]
#[derive(Debug, AnchorDeserialize)]
pub struct ConfigurationRegistry {
    pub oracle_pubkey: Pubkey,
    pub sol_quantity: u64,
    pub slot_threshold: u64,
    pub price_maximum_age: u64,
    pub max_fills_storage: u64,
    pub authorized_dequeuers: Vec<Pubkey>,
}

impl AccountDeserialize for ConfigurationRegistry {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        ConfigurationRegistry::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        ConfigurationRegistry::try_from_slice(buf).map_err(|e| anchor_client::anchor_lang::error::Error::from(e))
    }
}
