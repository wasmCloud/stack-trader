//! # Merchant
//!
//! The merchant system awaits frames for entities that have a `sell_list` component. Each time
//! it encounters such a frame, it will perform the following operations on each item in the
//! sell list:
//! - delete the item from the sell list collection
//! - appraise the item, determine a new amount for credits, and publish a new `wallet` component for the entity
//!
//! NOTE: the merchant system does NOT manage the player's inventory. It is the front-end's responsibility
//! to move an item out of `inventory` and into the `sell_list` as a means of triggering the merchant
//! system. This might appear visually as double-clicking an item from their inventory, having it appear
//! in another list (or simply not show up in the other list), and then noticing a moment later that their
//! credits have gone up
extern crate decscloud_codec as codec;
use codec::gateway::*;
use guest::prelude::*;
use stacktrader_types as trader;
use trader::components::*;

const STACK_SPENDY: &str = "spendy";
const STACK_TASTY: &str = "tasty";
const STACK_CRITICAL: &str = "critical";

/// Receives an entity, shard, elapsed time, etc from an EntityFrame
/// published on decs.frames.{shard}.{system}, e.g. `decs.frames.the_void.physics`
/// or `decs.frames.shard-two.navigation`.
pub(crate) fn handle_frame(
    ctx: &CapabilitiesContext,
    msg: guest::prelude::messaging::BrokerMessage,
) -> CallResult {
    let subject: Vec<&str> = msg.subject.split('.').collect();
    if subject.len() != 4 {
        return Err("Unknown message subject received".into());
    }
    let frame: decs::systemmgr::EntityFrame = serde_json::from_slice(&msg.body)?;
    let sell_rids = get_sell_list_rids(ctx, &frame.shard, &frame.entity_id)?;
    for rid in sell_rids {
        let sell_item = get_sell_item(ctx, &rid)?;
        // NOTE: this is not transactional and we're okay with that (for now)
        publish_item_delete(ctx, &frame.shard, &frame.entity_id, &rid)?;
        publish_credits_add(ctx, &frame.shard, &frame.entity_id, &sell_item)?;
    }

    Ok(vec![])
}

/// Retrieve all of the fully-qualified RIDs currently in the entity's `sell_list` component
fn get_sell_list_rids(ctx: &CapabilitiesContext, shard: &str, entity: &str) -> Result<Vec<String>> {
    let key = format!("decs:components:{}:{}:{}", shard, entity, super::SELL_LIST);
    Ok(ctx.kv().list_range(&key, 0, -1)?)
}

/// Retrieve the contents of an inventory item from the KV store. Note that due to current
/// game design, this value is identical to a `MiningResource`. In the future, there might be
/// another structure for an inventory item
fn get_sell_item(
    ctx: &CapabilitiesContext,
    rid: &str,
) -> std::result::Result<MiningResource, Box<dyn std::error::Error>> {
    let key = rid.replace('.', ":");
    match &ctx.kv().get(&key)? {
        Some(ref s) => {
            let mr: MiningResource = serde_json::from_str(s)?;
            Ok(mr)
        }
        None => Err("no such item".into()),
    }
}

/// Publish a delete call for the given collection rid e.g. `decs.components.(shard).(entity).sell_list`
/// Passing the "rid" of the item from that collection to delete will remove just that one item
/// from the collection, per component manager protocol. In other words, component manager knows whether
/// the item being deleted is an item within a collection or a model.
fn publish_item_delete(
    ctx: &CapabilitiesContext,
    shard: &str,
    entity: &str,
    rid: &str,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let del = ResProtocolRequest::Delete(format!(
        "decs.components.{}.{}.{}",
        shard,
        entity,
        super::SELL_LIST
    ));
    let params = serde_json::json!({"params": {"rid": rid}});
    ctx.msg()
        .publish(&del.to_string(), None, &serde_json::to_vec(&params)?)?;
    Ok(())
}

/// Pull the current credits owned by the given shard+entity and produce a new wallet
/// with that amount plus the value of the inventory item being examined. Publish that
/// new wallet via "component set" operation targeted at the component manager.
fn publish_credits_add(
    ctx: &CapabilitiesContext,
    shard: &str,
    entity: &str,
    item: &MiningResource,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let key = format!("decs:components:{}:{}:{}", shard, entity, super::WALLET);

    let wallet: CreditWallet = {
        match ctx.kv().get(&key)? {
            Some(s) => serde_json::from_str(&s)?,
            None => CreditWallet::default(),
        }
    };

    let itemval: i32 = if item.stack_type == STACK_CRITICAL {
        100
    } else if item.stack_type == STACK_TASTY {
        50
    } else if item.stack_type == STACK_SPENDY {
        30
    } else {
        0 // this shouldn't happen unless there's a malformed mining resource in the player's inv
    };
    let new_amount = (itemval * item.qty as i32) + wallet.credits; // TODO: this is not idempotent and potentially problematic with multiple merchant systems running...
    let wallet = CreditWallet {
        credits: new_amount,
    };

    let setreq = ResProtocolRequest::Set(key.replace(':', ".").to_string());
    ctx.msg()
        .publish(&setreq.to_string(), None, &serde_json::to_vec(&wallet)?)?;

    Ok(())
}
