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
extern crate decscloud_codec as decs;
extern crate waxosuit_guest as guest;

use decs::systemmgr::*;
use guest::prelude::*;

call_handler!(handle_call);

const NO_MESSAGE: &str = "(no message)";
const POSITION: &str = "position";
const VELOCITY: &str = "velocity";
const TARGET: &str = "target";
const SYSTEM_NAME: &str = "navigation";
const REGISTRY_SUBJECT: &str = "decs.system.registry";
const FRAMERATE: u32 = 1;

pub fn handle_call(ctx: &CapabilitiesContext, operation: &str, msg: &[u8]) -> CallResult {
    match operation {
        messaging::OP_DELIVER_MESSAGE => handle_message(ctx, msg),
        core::OP_HEALTH_REQUEST => Ok(vec![]),
        _ => Err("bad dispatch".into()),
    }
}

/// Routes message either to the `handle_ping` function for registry pings or `handle_frame` for position updates
fn handle_message(
    ctx: &CapabilitiesContext,
    msg: impl Into<messaging::DeliverMessage>,
) -> CallResult {
    let msg = msg.into().message;
    let subject = msg
        .as_ref()
        .map_or(NO_MESSAGE.to_string(), |m| m.subject.to_string());
    ctx.log(&format!(
        "Received message from broker on subject '{}'",
        subject
    ));
    match subject.as_ref() {
        NO_MESSAGE => Err("No message".into()),
        REGISTRY_SUBJECT => handle_ping(ctx, msg.unwrap()),
        _ => nav::handle_frame(ctx, msg.unwrap()),
    }
}

/// Receives messages on the subject `system.registry` and replies with physics system metadata
fn handle_ping(ctx: &CapabilitiesContext, msg: messaging::BrokerMessage) -> CallResult {
    let payload = System {
        name: SYSTEM_NAME.to_string(),
        framerate: FRAMERATE,
        components: vec![
            POSITION.to_string(),
            VELOCITY.to_string(),
            TARGET.to_string(),
        ],
    };
    let reply_to = if msg.reply_to.is_empty() {
        format!("{}.replies", REGISTRY_SUBJECT)
    } else {
        msg.reply_to
    };
    if let Err(e) = ctx
        .msg()
        .publish(&reply_to, None, &serde_json::to_vec(&payload)?)
    {
        return Err(format!("Error publishing message: {}", e).into());
    };
    Ok(vec![])
}

mod nav;
