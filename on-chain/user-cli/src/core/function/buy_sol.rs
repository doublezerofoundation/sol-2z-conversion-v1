use std::error::Error;
pub fn buy_sol(bid_price: String) -> Result<(), Box<dyn Error>> {
    println!("Buying SOL for {}", bid_price);
    Ok(())
}