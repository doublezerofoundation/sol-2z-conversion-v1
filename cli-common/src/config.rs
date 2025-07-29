use std::error::Error;

pub trait ConfigLoader {
    fn load() -> Result<Self, Box<dyn Error>> where Self: Sized;
}
