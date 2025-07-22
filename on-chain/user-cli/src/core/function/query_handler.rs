use std::error::Error;

pub fn get_quantity() -> Result<(), Box<dyn Error>> {
    println!("Getting Quantity");
    Ok(())
}

pub fn get_price() -> Result<(), Box<dyn Error>> {
    println!("Getting Price");
    Ok(())
}