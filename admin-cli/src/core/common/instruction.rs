pub const INITIALIZE_SYSTEM_INSTRUCTION: &[u8] = b"global:initialize_system";
pub const SET_FILLS_CONSUMER_INSTRUCTION: &[u8] = b"global:set_fills_consumer";
pub const ADD_TO_DENY_LIST_INSTRUCTION: &[u8] = b"global:add_to_deny_list";
pub const REMOVE_FROM_DENY_LIST_INSTRUCTION: &[u8] = b"global:remove_from_deny_list";
pub const UPDATE_CONFIGURATION_REGISTRY_INSTRUCTION: &[u8] = b"global:update_configuration_registry";
pub const SET_ADMIN_INSTRUCTION: &[u8] = b"global:set_admin";
pub const TOGGLE_SYSTEM_STATE_INSTRUCTION: &[u8] = b"global:toggle_system_state";
pub const SET_DENY_LIST_AUTHORITY_INSTRUCTION: &[u8] = b"global:set_deny_list_authority";





// mock program
pub const MOCK_SYSTEM_INITIALIZE: &[u8] = b"dz::ix::initialize";
pub const MOCK_TOKEN_MINT_INSTRUCTION: &[u8] = b"dz::ix::mint2z";
