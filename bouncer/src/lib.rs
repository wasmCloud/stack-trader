// Copyright 2015-2019 Capital One Services, LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#[macro_use]
extern crate serde_json;

extern crate decscloud_common as decs;
extern crate waxosuit_guest as guest;

const RESET_EVERY_TICKS: i64 = 30; // refresh resgate cache every 30 ticks (@ 1FPS = 30seconds)

use guest::prelude::*;

call_handler!(handle_call);

pub fn handle_call(ctx: &CapabilitiesContext, operation: &str, msg: &[u8]) -> CallResult {
    match operation {
        decs::timer::OP_TIMER_TICK => handle_timer(ctx, msg),
        core::OP_HEALTH_REQUEST => Ok(vec![]),
        _ => Err("bad dispatch".into()),
    }
}


pub fn handle_timer(
    ctx: &CapabilitiesContext,
    tick: impl Into<decs::timer::TimerTick>,
) -> CallResult {
    let tick = tick.into();
    if tick.seq_no % RESET_EVERY_TICKS == 0 {
        let payload = json!({
            "resources": ["decs.components.mainworld.*.radar_contacts"]
        });
        ctx.msg().publish(
            "system.reset",
            None,
            &serde_json::to_vec(&payload)?
        )?;        
    }
    Ok(vec![])    
}


