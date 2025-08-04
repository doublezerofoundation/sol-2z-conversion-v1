use std::error::Error;

pub trait ReturnData<T> {
    fn try_deserialize(data: &[u8]) -> Result<T, Box<dyn Error>>;
}

impl ReturnData<u64> for u64 {
    fn try_deserialize(data: &[u8]) -> Result<u64, Box<dyn Error>> {
        Ok(u64::from_le_bytes(data.try_into()?))
    }
}