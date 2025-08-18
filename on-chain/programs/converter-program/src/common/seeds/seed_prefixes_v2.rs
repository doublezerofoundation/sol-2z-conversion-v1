// V2 of all seed prefixes

#[derive(Debug, Clone, Copy)]
pub enum SeedPrefixesV2 {
    ConfigurationRegistry,
    ProgramState,
    DenyListRegistry,
}

impl SeedPrefixesV2 {
    pub fn as_bytes(&self) -> &'static [u8] {
        match self {
            SeedPrefixesV2::ConfigurationRegistry => b"system_config_v2",
            SeedPrefixesV2::ProgramState => b"state_v2",
            SeedPrefixesV2::DenyListRegistry => b"deny_list_v2",
        }
    }
}
