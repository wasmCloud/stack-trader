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

extern crate decscloud_codec as codec;
extern crate serde_json;
extern crate wascap_guest as guest;

use codec::systemmgr::System;
use guest::prelude::*;
use serde_json::Value;
use stacktrader_types as trader;
use trader::components::*;

call_handler!(handle_call);

const NO_MESSAGE: &str = "(no message)";
const REGISTRY_SUBJECT: &str = "decs.system.registry";

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
fn handle_ping(
    ctx: &CapabilitiesContext,
    msg: guest::prelude::messaging::BrokerMessage,
) -> CallResult {
    let payload = System {
        name: "physics".to_string(),
        framerate: 60,
        components: vec!["Position".to_string(), "Velocity".to_string()],
    };
    let ref reply_to = match msg.reply_to.len() {
        0 => format!("decs.{}", REGISTRY_SUBJECT),
        _ => msg.reply_to,
    };
    if let Err(_) = ctx
        .msg()
        .publish(reply_to, None, &serde_json::to_vec(&payload).unwrap())
    {
        return Err("Error publishing message".into());
    };
    Ok(vec![])
}

/// Receives messages on the subject `decs.systems.{shard}.{system}.frames`, e.g. `decs.systems.default.physics.frames`
fn handle_frame(
    ctx: &CapabilitiesContext,
    msg: guest::prelude::messaging::BrokerMessage,
) -> CallResult {
    let subject: Vec<&str> = msg.subject.split(".").collect();
    if subject.len() != 5 {
        return Err("Unknown message subject received".into());
    }

    let data = extract_frame(&msg.body);
    if let Err(_) = data {
        return Err("Did not receive components needed for frame update".into());
    }

    let (entity, elapsed, pos, vel) = data.unwrap();
    if vel.mag == 0 {
        return Ok(vec![]);
    } else if vel.ux == 0.0 && vel.uy == 0.0 && vel.uz == 0.0 {
        return Err("Bad target vector".into());
    }

    if let Ok(new_position) = new_position(elapsed, &pos, &vel) {
        let publish_subject = &format!("decs.{}.{}.position.put", subject[2], entity);
        if let Err(_) = ctx.msg().publish(
            publish_subject,
            None,
            &serde_json::to_vec(&new_position).unwrap(),
        ) {
            return Err("Error publishing message".into());
        };
    };
    Ok(vec![])
}

/// Extracts the elapsed time, position and velocity values out of the aggregate frame
fn extract_frame(frame_raw: &[u8]) -> Result<(String, u64, Position, Velocity)> {
    let v: Value = serde_json::from_slice(frame_raw)?;

    let entity = serde_json::from_value(v["entity"].clone())?;
    let elapsed = serde_json::from_value(v["elapsed"].clone())?;
    let pos = serde_json::from_value(v["position"].clone())?;
    let vel = serde_json::from_value(v["velocity"].clone())?;

    Ok((entity, elapsed, pos, vel))
}

/// Calculates a new position based on a current position and velocity over an elapsed time
fn new_position(elapsed: u64, pos: &Position, vel: &Velocity) -> Result<Position> {
    let multiplier = (u64::from(vel.mag) * elapsed) as f64 / 3600000.0;
    Ok(Position {
        x: pos.x + vel.ux * multiplier,
        y: pos.y + vel.uy * multiplier,
        z: pos.z + vel.uz * multiplier,
    })
}

#[cfg(test)]
mod test {
    use super::extract_frame;
    use super::new_position;

    #[test]
    fn test_extract_frame() {
        let data = br#"
        {
            "entity": "34a79797-163e-474b-a8ff-970f2808c1b1",
            "elapsed": 16,
            "position": {
                "x": 1,
                "y": 2.5,
                "z": 31.056
            },
            "velocity": {
                "mag": 7500,
                "ux": 1.0,
                "uy": 0,
                "uz": 0
            }
        }
        "#;

        let (entity, elapsed, pos, vel) = extract_frame(data).unwrap();
        assert_eq!(entity, "34a79797-163e-474b-a8ff-970f2808c1b1".to_string());
        assert_eq!(elapsed, 16);
        assert_eq!(pos.x, 1.0);
        assert_eq!(pos.y, 2.5);
        assert_eq!(vel.mag, 7500);
    }

    #[test]
    fn test_new_position() {
        let data = br#"
        {
            "entity": "34a79797-163e-474b-a8ff-970f2808c1b1",
            "elapsed": 16,
            "position": {
                "x": 1,
                "y": 30,
                "z": -10
            },
            "velocity": {
                "mag": 7200,
                "ux": 1.0,
                "uy": 1.0,
                "uz": 1.0
            }
        }
        "#;

        let (entity, elapsed, pos, vel) = extract_frame(data).unwrap();
        assert_eq!(entity, "34a79797-163e-474b-a8ff-970f2808c1b1".to_string());
        assert_eq!(elapsed, 16);
        assert_eq!(pos.x, 1.0);
        assert_eq!(pos.y, 30.0);
        assert_eq!(pos.z, -10.0);
        assert_eq!(vel.mag, 7200);

        let new_pos = new_position(elapsed, &pos, &vel).unwrap();
        assert_eq!(new_pos.x, 1.032);
        assert_eq!(new_pos.y, 30.032);
        assert_eq!(new_pos.z, -9.968);

        let new_pos_two = new_position(elapsed, &new_pos, &vel).unwrap();
        assert_eq!(new_pos_two.x, 1.064);
        assert_eq!(new_pos_two.y, 30.064);
        assert_eq!(new_pos_two.z, -9.936);
    }

    #[test]
    fn test_no_position_change() {
        let data = br#"
        {
            "entity": "34a79797-163e-474b-a8ff-970f2808c1b1",
            "elapsed": 16,
            "position": {
                "x": 11.0,
                "y": -49.0,
                "z": 20.0
            },
            "velocity": {
                "mag": 0,
                "ux": 1.0,
                "uy": 1.0,
                "uz": 1.0
            }
        }
        "#;
        let (entity, elapsed, pos, vel) = extract_frame(data).unwrap();
        assert_eq!(entity, "34a79797-163e-474b-a8ff-970f2808c1b1".to_string());
        assert_eq!(elapsed, 16);
        assert_eq!(pos.x, 11.0);
        assert_eq!(pos.y, -49.0);
        assert_eq!(pos.z, 20.0);
        assert_eq!(vel.mag, 0);

        let new_pos = new_position(elapsed, &pos, &vel).unwrap();
        assert_eq!(new_pos.x, pos.x);
        assert_eq!(new_pos.y, pos.y);
        assert_eq!(new_pos.z, pos.z);
    }

}
