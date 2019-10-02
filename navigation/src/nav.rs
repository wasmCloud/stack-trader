use guest::prelude::*;
use stacktrader_types as trader;
use trader::components::*;

const THRESHOLD_DISTANCE_KM: f64 = 1.5;

/// Receives an entity, shard, elapsed time, etc from an EntityFrame
/// published on decs.frames.{shard}.{system}, e.g. `decs.frames.the_void.physics`
/// or `decs.frames.shard-two.navigation`. Resulting new component should be published
/// on call.decs.components.{shard-id}.{entity-id}.{component-name}.set
pub(crate) fn handle_frame(
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
        frame.shard,
        frame.entity_id,
        super::POSITION
    ))?;
    let velocity_value = ctx.kv().get(&format!(
        "decs:components:{}:{}:{}",
        frame.shard,
        frame.entity_id,
        super::VELOCITY
    ))?;
    let target_value = ctx.kv().get(&format!(
        "decs:components:{}:{}:{}",
        frame.shard,
        frame.entity_id,
        super::TARGET
    ))?;

    if let (Some(position_str), Some(velocity_str), Some(target_str)) =
        (position_value, velocity_value, target_value)
    {
        let position: Position = serde_json::from_str(&position_str)?;
        let velocity: Velocity = serde_json::from_str(&velocity_str)?;
        let target: Target = serde_json::from_str(&target_str)?;
        process_frame(
            ctx,
            frame.shard,
            frame.entity_id,
            &position,
            &velocity,
            &target,
        )
    } else {
        Err(format!(
            "position, velocity, or target component could not be retrieved for entity_id: {}",
            frame.entity_id
        )
        .into())
    }
}

fn process_frame(
    ctx: &CapabilitiesContext,
    shard: String,
    entity_id: String,
    pos: &Position,
    vel: &Velocity,
    target: &Target,
) -> CallResult {
    let target_pos = get_target_position(ctx, &target.rid)?;

    let nt = Target {
        eta_ms: target_pos.eta_at(pos, &vel),
        distance_km: pos.distance_to(&target_pos),
        rid: target.rid.clone(),
    };

    let publish_subject = format!("call.decs.components.{}.{}.target.set", shard, entity_id);
    let payload = json!({ "params": nt });
    if ctx
        .msg()
        .publish(&publish_subject, None, &serde_json::to_vec(&payload)?)
        .is_err()
    {
        return Err("Error publishing message".into());
    };

    // If we are within THRESHOLD km of the target, automatically set velocity to zero
    if nt.distance_km <= THRESHOLD_DISTANCE_KM {
        let payload = json!({ "params": Velocity{ mag: 0, ..*vel} });
        ctx.msg().publish(
            &format!("call.decs.components.{}.{}.velocity.set", shard, entity_id),
            None,
            &serde_json::to_vec(&payload)?,
        )?;
    }

    Ok(vec![])
}

fn get_target_position(
    ctx: &CapabilitiesContext,
    rid: &str,
) -> std::result::Result<Position, Box<dyn std::error::Error>> {
    let sp: Vec<&str> = rid.split('.').collect();
    let shard = sp[2];
    let entity = sp[3];
    let pos_value = ctx
        .kv()
        .get(&format!("decs:components:{}:{}:position", shard, entity))?;
    match pos_value {
        Some(p) => Ok(serde_json::from_str(&p)?),
        None => Err("no such position".into()),
    }
}
