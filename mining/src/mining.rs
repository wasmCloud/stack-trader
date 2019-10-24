use guest::prelude::*;
use stacktrader_types as trader;
use trader::components::*;

/// Receives an entity, shard, elapsed time, etc from an EntityFrame
/// published on decs.frames.{shard}.{system}, e.g. `decs.frames.the_void.physics`
/// or `decs.frames.shard-two.navigation`. Resulting new component should be published
/// on call.decs.components.{shard-id}.{entity-id}.{component-name}.set or appropriate
/// collection add
pub(crate) fn handle_frame(
    ctx: &CapabilitiesContext,
    msg: guest::prelude::messaging::BrokerMessage,
) -> CallResult {
    let frame: decs::systemmgr::EntityFrame = serde_json::from_slice(&msg.body)?;

    let extractor_value = ctx.kv().get(&format!(
        "decs:components:{}:{}:{}",
        frame.shard,
        frame.entity_id,
        super::EXTRACTOR
    ))?;
    if let Some(extractor_str) = extractor_value {
        // Either publish an update to the extractor (less time remaining)
        // or delete the extractor and add the resource to the player's inventory
        let extractor: MiningExtractor = serde_json::from_str(&extractor_str)?;
        let extractor = update_extractor(extractor, frame.elapsed_ms);
        if extractor.remaining_ms == 0.0 {
            extract_resource(ctx, &extractor, &frame.shard, &frame.entity_id)?;
        } else {
            publish_extractor(ctx, &extractor, &frame.shard, &frame.entity_id)?;
        }
    }

    Ok(vec![])
}

fn publish_extractor(
    ctx: &CapabilitiesContext,
    extractor: &MiningExtractor,
    shard: &str,
    entity_id: &str,
) -> CallResult {
    let subject = format!(
        "call.decs.components.{}.{}.{}.set",
        shard,
        entity_id,
        super::EXTRACTOR
    );
    let payload = json!({ "params": extractor });
    ctx.msg()
        .publish(&subject, None, &serde_json::to_vec(&payload)?)?;
    Ok(vec![])
}

fn update_extractor(extractor: MiningExtractor, elapsed_ms: u32) -> MiningExtractor {
    let mut remaining = extractor.remaining_ms - f64::from(elapsed_ms);
    if remaining <= 0.0 {
        remaining = 0.0;
    }
    MiningExtractor {
        remaining_ms: remaining,
        ..extractor
    }
}

fn extract_resource(
    ctx: &CapabilitiesContext,
    extractor: &MiningExtractor,
    shard: &str,
    entity_id: &str,
) -> CallResult {
    let resource_value = ctx.kv().get(&extractor.target)?;
    if let Some(resource_str) = resource_value {
        // This works because the frame's entity and shard are that of the
        // "owner" of the extractor component
        let player_inventory = format!(
            "decs.components.{}.{}.{}",
            shard,
            entity_id,
            super::INVENTORY
        );
        let inv_subject = format!("call.{}.add", player_inventory);
        let add_payload = json!({"params" : resource_str});
        // Take the resource item as-is from the mining resource and add to player inventory
        ctx.msg()
            .publish(&inv_subject, None, &serde_json::to_vec(&add_payload)?)?;
        // The extractor target must always be the fully qualified ID of the mining_resource component
        let del_subject = format!("call.{}.delete", extractor.target);
        let params = json!({
            "params": {
                "rid": extractor.target
            }
        });
        // Delete the extractor component
        ctx.msg()
            .publish(&del_subject, None, &serde_json::to_vec(&params)?)?;
        Ok(vec![])
    } else {
        Err("Resource mining target did not exist".into())
    }
}
