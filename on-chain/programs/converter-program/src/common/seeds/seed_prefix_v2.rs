// V2 of all seed prefixes

#[derive(Debug, Clone, Copy)]
pub enum SeedPrefixV2{
    ConfigurationRegistry,
    ProgramState,
    DenyListRegistry,
}

impl SeedPrefixV2 {
    pub fn as_bytes(&self) -> &'static [u8] {
        match self {
            SeedPrefixV2::ConfigurationRegistry => b"system_config_v2",
            SeedPrefixV2::ProgramState => b"state_v2",
            SeedPrefixV2::DenyListRegistry => b"deny_list_v2",
        }
    }
}
