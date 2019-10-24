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

use decs::systemmgr::*;
use guest::prelude::*;
use stacktrader_types as trader;
use trader::components::*;

call_handler!(handle_call);

const NO_MESSAGE: &str = "(no message)";
const REGISTRY_SUBJECT: &str = "decs.system.registry";
const POSITION: &str = "position";
const VELOCITY: &str = "velocity";
const FRAMERATE: u32 = 1;
const SYSTEM_NAME: &str = "physics";

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
        _ => handle_frame(ctx, msg.unwrap()),
    }
}

/// Receives messages on the subject `system.registry` and replies with physics system metadata
fn handle_ping(ctx: &CapabilitiesContext, msg: messaging::BrokerMessage) -> CallResult {
    let payload = System {
        name: SYSTEM_NAME.to_string(),
        framerate: FRAMERATE,
        components: vec![POSITION.to_string(), VELOCITY.to_string()],
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

/// Receives an entity, shard, elapsed time, etc from an EntityFrame
/// published on decs.frames.{shard}.{system}, e.g. `decs.frames.the_void.physics`
/// or `decs.frames.shard-two.nav`. Resulting new component should be published
/// on call.decs.components.{shard-id}.{entity-id}.{component-name}.set
fn handle_frame(
    ctx: &CapabilitiesContext,
    msg: guest::prelude::messaging::BrokerMessage,
) -> CallResult {
    let subject: Vec<&str> = msg.subject.split('.').collect();
    if subject.len() != 4 {
        return Err("Unknown message subject received".into());
    }

    let frame: decs::systemmgr::EntityFrame = serde_json::from_slice(&msg.body)?;

    let position_value = ctx.kv().get(&format!(
        "decs:components:{}:{}:{}",
        frame.shard, frame.entity_id, POSITION
    ))?;
    let velocity_value = ctx.kv().get(&format!(
        "decs:components:{}:{}:{}",
        frame.shard, frame.entity_id, VELOCITY
    ))?;
    if let (Some(position_str), Some(velocity_str)) = (position_value, velocity_value) {
        let position: Position = serde_json::from_str(&position_str)?;
        let velocity: Velocity = serde_json::from_str(&velocity_str)?;

        if velocity.mag == 0 {
            return Ok(vec![]);
        } else if velocity.ux == 0.0 && velocity.uy == 0.0 && velocity.uz == 0.0 {
            return Err("Bad target vector".into());
        }

        if let Ok(new_position) = new_position(frame.elapsed_ms.into(), &position, &velocity) {
            let publish_subject = &format!(
                "call.decs.components.{}.{}.{}.set",
                frame.shard, frame.entity_id, POSITION
            );
            let payload = json!({ "params": new_position });
            if ctx
                .msg()
                .publish(publish_subject, None, &serde_json::to_vec(&payload)?)
                .is_err()
            {
                return Err("Error publishing message".into());
            };
        };
    } else {
        return Err(format!(
            "position or velocity component could not be retrieved for entity_id: {}",
            frame.entity_id
        )
        .into());
    };
    Ok(vec![])
}

/// Calculates a new position based on a current position and velocity over an elapsed time
fn new_position(elapsed: u64, pos: &Position, vel: &Velocity) -> Result<Position> {
    let multiplier = (u64::from(vel.mag) * elapsed) as f64 / 3_600_000.0;
    Ok(Position {
        x: pos.x + vel.ux * multiplier,
        y: pos.y + vel.uy * multiplier,
        z: pos.z + vel.uz * multiplier,
    })
}

#[cfg(test)]
mod test {
    use super::new_position;
    use super::Position;
    use super::Velocity;

    const FLOATEPSILON: f64 = std::f64::EPSILON;

    #[test]
    fn test_new_position() {
        let elapsed = 16;
        let pos = Position {
            x: 1.0,
            y: 30.0,
            z: -10.0,
        };
        let vel = Velocity {
            mag: 7200,
            ux: 1.0,
            uy: 1.0,
            uz: 1.0,
        };

        assert_eq!(elapsed, 16);
        assert!(pos.x - 1.0 <= FLOATEPSILON);
        assert!(pos.y - 30.0 <= FLOATEPSILON);
        assert!(pos.z - 10.0 <= FLOATEPSILON);
        assert_eq!(vel.mag, 7200);

        let new_pos = new_position(elapsed, &pos, &vel).unwrap();
        assert!(new_pos.x - 1.032 <= FLOATEPSILON);
        assert!(new_pos.y - 30.032 <= FLOATEPSILON);
        assert!(new_pos.z - 9.968 <= FLOATEPSILON);

        let new_pos_two = new_position(elapsed, &new_pos, &vel).unwrap();
        assert!(new_pos_two.x - 1.064 <= FLOATEPSILON);
        assert!(new_pos_two.y - 30.064 <= FLOATEPSILON);
        assert!(new_pos_two.z - 9.936 <= FLOATEPSILON);
    }

    #[test]
    fn test_no_position_change() {
        let elapsed = 16;
        let pos = Position {
            x: 11.0,
            y: 49.0,
            z: -20.0,
        };
        let vel = Velocity {
            mag: 0,
            ux: 1.0,
            uy: 1.0,
            uz: 1.0,
        };
        assert_eq!(elapsed, 16);

        assert!(pos.x - 11.0 <= FLOATEPSILON);
        assert!(pos.y - 49.0 <= FLOATEPSILON);
        assert!(pos.z + 20.0 <= FLOATEPSILON);
        assert_eq!(vel.mag, 0);

        let new_pos = new_position(elapsed, &pos, &vel).unwrap();
        assert!(new_pos.x - pos.x <= FLOATEPSILON);
        assert!(new_pos.y - pos.y <= FLOATEPSILON);
        assert!(new_pos.z - pos.z <= FLOATEPSILON);
    }
}
