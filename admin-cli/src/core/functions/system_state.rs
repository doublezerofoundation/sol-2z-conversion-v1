use std::error::Error;
use crate::core::common::error::INVALID_ARGUMENTS;

pub fn view_system_state() -> Result<(), Box<dyn Error>> {
    println!("View System State");
    Ok(())
}
pub fn toggle_system_state(active: bool, pause: bool) -> Result<(), Box<dyn Error>> {
    println!("Toggle System State");

    let set_to = validate_and_extract_user_input(active, pause)?;

    println!("Set System State is it {:?}", Some(set_to));
    Ok(())
}
fn validate_and_extract_user_input(active: bool, pause: bool) -> Result<bool, Box<dyn Error>> {
    // checking whether use can provide both active and pause as input
    if active && pause {
        return Err(Box::from(INVALID_ARGUMENTS))
    }

    let set_to = if active {
        Some(true)
    } else if pause {
        Some(false)
    } else {
        None
    };

    match set_to {
        Some(value) => Ok(value),
        None => Err(Box::from(INVALID_ARGUMENTS)),
    }
}