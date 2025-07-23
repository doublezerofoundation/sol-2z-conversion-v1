use std::error::Error;
pub fn view_config() -> Result<(), Box<dyn Error>> {
    println!("View Configs");
    Ok(())
}
pub fn update_config() -> Result<(), Box<dyn Error>> {
    println!("Update Configs");
    Ok(())
}