use anchor_client::anchor_lang::prelude:: *;
use cli_common::utils::return_data::ReturnData;

#[derive(Debug, AnchorDeserialize)]
pub struct DequeueFillsResult {
    pub sol_dequeued: u64,
    pub token_2z_dequeued: u64,
    pub fills_consumed: u64
}

impl AccountDeserialize for DequeueFillsResult {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        DequeueFillsResult::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        DequeueFillsResult::deserialize(buf).map_err(Into::into)
    }
}

impl ReturnData<DequeueFillsResult> for DequeueFillsResult {
    fn try_deserialize(data: &[u8]) -> std::result::Result<DequeueFillsResult, Box<dyn std::error::Error>> {
        let mut data_slice = data;
        let result = <DequeueFillsResult as AccountDeserialize>::try_deserialize(&mut data_slice)?;
        Ok(result)
    }
}