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

extern crate serde_json;
extern crate wascap_guest as guest;

use guest::prelude::*;
use serde_json::Value;
use stacktrader_types as trader;
use trader::components::*;

call_handler!(handle_call);

pub fn handle_call(ctx: &CapabilitiesContext, operation: &str, msg: &[u8]) -> CallResult {
    match operation {
        messaging::OP_DELIVER_MESSAGE => handle_frame(ctx, msg),
        core::OP_HEALTH_REQUEST => Ok(vec![]),
        _ => Err("bad dispatch".into()),
    }
}

/// Receives messages on the subject `systems.{shard}.{system}.frames`, e.g. `systems.default.physics.frames`
fn handle_frame(
    ctx: &CapabilitiesContext,
    msg: impl Into<messaging::DeliverMessage>,
) -> CallResult {
    let msg = msg.into().message;
    ctx.log(&format!(
        "Received message from broker on subject '{}'",
        msg.as_ref()
            .map_or("(no message)".to_string(), |m| m.subject.to_string())
    ));
    let bodyvec = msg.unwrap().body;

    // This frame should have three objects: "elapsed", "position" and "velocity"
    let (_elapsed, _pos, _vel) = extract_frame(&bodyvec)?;

    Ok(vec![])
}

/// Extracts the elapsed time, position and velocity values out of the aggregate frame
fn extract_frame(frame_raw: &[u8]) -> Result<(u64, Position, Velocity)> {
    let v: Value = serde_json::from_slice(frame_raw)?;

    let elapsed = serde_json::from_value(v["elapsed"].clone())?;
    let pos = serde_json::from_value(v["position"].clone())?;
    let vel = serde_json::from_value(v["velocity"].clone())?;

    Ok((elapsed, pos, vel))
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

        let (elapsed, pos, vel) = extract_frame(data).unwrap();
        assert_eq!(elapsed, 16);
        assert_eq!(pos.x, 1.0);
        assert_eq!(pos.y, 2.5);
        assert_eq!(vel.mag, 7500);
    }

    #[test]
    fn test_new_position() {
        let data = br#"
        {
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

        let (elapsed, pos, vel) = extract_frame(data).unwrap();
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
}
