use std::error::Error;
pub fn withdraw_2z_tokens(token_amount: String, to_account: String) -> Result<(), Box<dyn Error>> {
    println!("Withdrawing 2Z Tokens value of {} to {}", token_amount, to_account);
    Ok(())
}