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

/*
need to listen for game ticks on decs.frames.{shard}.radar
need to listen for registry pings on decs.system.registry and reply on decs.system.registry.replies

An entity can have a radar_installation component with a radius
Radar system's responsibility is to take the metadata about the detected objects
*/

#[macro_use]
extern crate lazy_static;
extern crate decscloud_codec as codec;
extern crate waxosuit_guest as guest;

use codec::systemmgr::*;
use guest::prelude::*;

call_handler!(handle_call);

const NO_MESSAGE: &str = "(no message)";
const FRAMERATE: u32 = 1;
const SYSTEM_NAME: &str = "radar";
const RADAR_RECEIVER: &str = "radar_receiver";
const POSITION: &str = "position";
const REGISTRY_SUBJECT: &str = "decs.system.registry";
const POSITION_CHANGE_SUBJECT_LENGTH: usize = 7; // `event.decs.components.{shard}.{entity}.position.change`
const FRAME_SUBJECT_LENGTH: usize = 4; // `decs.frames.{shard}.{system}

pub fn handle_call(ctx: &CapabilitiesContext, operation: &str, msg: &[u8]) -> CallResult {
    match operation {
        messaging::OP_DELIVER_MESSAGE => handle_message(ctx, msg),
        core::OP_HEALTH_REQUEST => Ok(vec![]),
        _ => Err("bad dispatch".into()),
    }
}

/// Routes message either to the `handle_ping` function for registry pings or TODO
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
        _ => handle_incoming(ctx, msg.unwrap()),
    }
}

/// Receives messages on the subject `system.registry` and replies with radar system metadata
fn handle_ping(ctx: &CapabilitiesContext, msg: messaging::BrokerMessage) -> CallResult {
    let payload = System {
        name: SYSTEM_NAME.to_string(),
        framerate: FRAMERATE,
        components: vec![RADAR_RECEIVER.to_string(), POSITION.to_string()],
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

/// Separates messages into either caching an entity position or handling a frame.
/// `event.decs.components.{shard}.{entity}.position.change`  subject for cache position
/// `decs.frames.{shard}.{system}`                      subject for handle system frame
fn handle_incoming(ctx: &CapabilitiesContext, msg: messaging::BrokerMessage) -> CallResult {
    let split_subject: Vec<&str> = msg.subject.split('.').collect();
    match split_subject.len() {
        POSITION_CHANGE_SUBJECT_LENGTH => radar::handle_entity_position_change(ctx, msg),
        FRAME_SUBJECT_LENGTH => radar::handle_frame(ctx, msg),
        _ => Err(format!("Unexpected message received on subject: {}", msg.subject).into()),
    }
}
mod radar;
