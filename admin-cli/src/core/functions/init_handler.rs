use std::error::Error;

pub fn init() -> Result<(), Box<dyn Error>> {
    println!("Initiating System");
    Ok(())
}