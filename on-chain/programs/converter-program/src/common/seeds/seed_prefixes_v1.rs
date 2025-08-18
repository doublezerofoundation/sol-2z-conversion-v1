// Current versions of all seed prefixes
// This file contains the active versions being used in production

#[derive(Debug, Clone, Copy)]
pub enum SeedPrefixesV1 {
    ConfigurationRegistry,
    ProgramState,
    DenyListRegistry,
}

impl SeedPrefixesV1 {
    pub fn as_bytes(&self) -> &'static [u8] {
        match self {
            SeedPrefixesV1::ConfigurationRegistry => b"system_config_v1",
            SeedPrefixesV1::ProgramState => b"state_v1",
            SeedPrefixesV1::DenyListRegistry => b"deny_list_v1",
        }
    }
}
