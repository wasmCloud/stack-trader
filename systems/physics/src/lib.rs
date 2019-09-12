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
use trader::components;

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

    // This frame should have two objects: "position" and "velocity"
    let (_pos, _vel) = extract_frame(&bodyvec)?;

    Ok(vec![])
}

/// Extracts the position and velocity values out of the aggregate frame
fn extract_frame(frame_raw: &[u8]) -> Result<(components::Position, components::Velocity)> {
    let v: Value = serde_json::from_slice(frame_raw)?;

    let pos = serde_json::from_value(v["position"].clone())?;
    let vel = serde_json::from_value(v["velocity"].clone())?;

    Ok((pos, vel))
}

#[cfg(test)]
mod test {
    use super::extract_frame;

    #[test]
    fn test_extract_frame() {
        let data = br#"
        {
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

        let (pos, vel) = extract_frame(data).unwrap();
        assert_eq!(pos.x, 1.0);
        assert_eq!(pos.y, 2.5);
        assert_eq!(vel.mag, 7500);
    }
}
