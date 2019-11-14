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
extern crate lazy_static;
#[macro_use]
extern crate serde_derive;
#[macro_use]
extern crate serde_json;

use decscloud_common::gateway::ResProtocolRequest;

extern crate decscloud_common as decs;
extern crate waxosuit_guest as guest;

use decs::systemmgr::*;
use guest::prelude::*;

call_handler!(handle_call);

// const NO_MESSAGE: &str = "(no message)";
const FRAMERATE: u32 = 1;
const SYSTEM_NAME: &str = "leaderboard";
const WALLET: &str = "wallet";
const REGISTRY_SUBJECT: &str = "decs.system.registry";

pub fn handle_call(ctx: &CapabilitiesContext, operation: &str, msg: &[u8]) -> CallResult {
    match operation {
        messaging::OP_DELIVER_MESSAGE => handle_message(ctx, msg),
        core::OP_HEALTH_REQUEST => Ok(vec![]),
        _ => Err("bad dispatch".into()),
    }
}

/// Routes message to corresponding function depending on the subject of the message
/// `decs.system.registry` => handle_ping function for registry pings
/// `decs.frames.{shard}.{system}` => handle_frame for updating the leaderboard
fn handle_message(
    ctx: &CapabilitiesContext,
    msg: impl Into<messaging::DeliverMessage>,
) -> CallResult {
    let msg = msg.into().message;

    if let Some(msg) = msg {
        if msg.subject == REGISTRY_SUBJECT {
            handle_ping(ctx, msg)
        } else if msg.subject.starts_with("decs.frames.") && msg.subject.ends_with(".leaderboard") {
            leaderboard::handle_frame(ctx, msg)
        } else {
            match ResProtocolRequest::from(msg.subject.as_str()) {
                ResProtocolRequest::Get(rid) if msg.subject.ends_with("leaderboard") => {
                    leaderboard::handle_get_collection(ctx, &rid, &msg)
                }
                ResProtocolRequest::Get(rid) => leaderboard::handle_get_single(ctx, &rid, &msg),
                ResProtocolRequest::Access(_) => handle_access(ctx, &msg),
                _ => Err("unknown service request format".into()),
            }
        }
    } else {
        Err("no message payload on subject".into())
    }
}

fn handle_access(ctx: &CapabilitiesContext, msg: &messaging::BrokerMessage) -> CallResult {
    let result = json!({
        "result" : {
            "get" : true,
            "call" : "*"
        }
    });
    ctx.msg()
        .publish(&msg.reply_to, None, &serde_json::to_vec(&result)?)?;
    Ok(vec![])
}

/// Receives messages on the subject `system.registry` and replies with radar system metadata
fn handle_ping(ctx: &CapabilitiesContext, msg: messaging::BrokerMessage) -> CallResult {
    let payload = System {
        name: SYSTEM_NAME.to_string(),
        framerate: FRAMERATE,
        components: vec![WALLET.to_string()],
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

mod leaderboard;
