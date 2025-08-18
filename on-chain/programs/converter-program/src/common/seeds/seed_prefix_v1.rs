// Current versions of all seed prefixes
// This file contains the active versions being used in production

#[derive(Debug, Clone, Copy)]
pub enum SeedPrefixV1 {
    ConfigurationRegistry,
    ProgramState,
    DenyListRegistry,
}

impl SeedPrefixV1 {
    pub fn as_bytes(&self) -> &'static [u8] {
        match self {
            SeedPrefixV1::ConfigurationRegistry => b"system_config_v1",
            SeedPrefixV1::ProgramState => b"state_v1",
            SeedPrefixV1::DenyListRegistry => b"deny_list_v1",
        }
    }
}
