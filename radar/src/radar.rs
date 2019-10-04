extern crate decscloud_codec as codec;
extern crate waxosuit_guest as guest;

use codec::gateway::*;
use guest::prelude::*;
use serde::{Deserialize, Serialize};
use stacktrader_types as trader;
use std::collections::HashMap;
use std::sync::RwLock;
use trader::components::*;

lazy_static! {
    static ref POSITIONS: RwLock<HashMap<String, Position>> = RwLock::new(HashMap::new());
}

const RADAR_CONTACTS: &str = "radar_contacts";

pub(crate) fn handle_frame(ctx: &CapabilitiesContext, msg: messaging::BrokerMessage) -> CallResult {
    let subject: Vec<&str> = msg.subject.split('.').collect();
    if subject.len() != 4 {
        return Err("Unknown message subject received".into());
    }

    let frame: codec::systemmgr::EntityFrame = serde_json::from_slice(&msg.body)?;

    let radar_receiver_value = ctx.kv().get(&format!(
        "decs:components:{}:{}:{}",
        frame.shard,
        frame.entity_id,
        super::RADAR_RECEIVER
    ))?;

    let position_value = ctx.kv().get(&format!(
        "decs:components:{}:{}:{}",
        frame.shard,
        frame.entity_id,
        super::POSITION
    ))?;

    let resource_id = format!("decs.components.{}.{}", frame.shard, frame.entity_id);

    if let (Some(radar_str), Some(position_str)) = (radar_receiver_value, position_value) {
        let radar_receiver: RadarReceiver = serde_json::from_str(&radar_str)?;
        let position: Position = serde_json::from_str(&position_str)?;

        let radar_contacts_key = &format!(
            "decs:components:{}:{}:{}",
            frame.shard, frame.entity_id, RADAR_CONTACTS
        );

        let old_contacts: Vec<RadarContact> = if ctx.kv().exists(radar_contacts_key)? {
            let mut old_contacts: Vec<RadarContact> = vec![];
            if let Some(contacts_str) = ctx.kv().get(radar_contacts_key)? {
                for c in contacts_str.split(',').collect::<Vec<&str>>() {
                    if let Some(radar_contact_str) = ctx.kv().get(c)? {
                        old_contacts.push(serde_json::from_str(&radar_contact_str.to_string())?);
                    }
                }
            }
            ctx.log(&format!("ALL OLD CONTACTS: {:?}", old_contacts));
            old_contacts
        } else {
            vec![]
        };

        let all_positions = POSITIONS.read().unwrap();
        ctx.log(&format!("RESOURCE: {}", resource_id));
        ctx.log(&format!("ALL POSITIONS: {:?}", all_positions));
        let updates = radar_updates(
            &resource_id,
            &position,
            &radar_receiver,
            &old_contacts,
            &all_positions,
        );

        for update in updates {
            match update {
                RadarContactDelta::Add(rc) => {
                    new_contact(ctx, &resource_id, &rc)?;
                }
                RadarContactDelta::Remove(rid) => {
                    delete_contact(ctx, &resource_id, &rid)?;
                }
                RadarContactDelta::Change(rc) => {
                    delete_contact(ctx, &resource_id, &rc.rid)?;
                    new_contact(ctx, &resource_id, &rc)?;
                }
            }
        }
    }
    Ok(vec![])
}

/// Function to publish a message to create a new collection or add a new component to a collection
fn new_contact(
    ctx: &CapabilitiesContext,
    rid: &String,
    radar_contact: &RadarContact,
) -> CallResult {
    let new_subject =
        ResProtocolRequest::New(format!("{}.{}", rid.to_string(), RADAR_CONTACTS)).to_string();
    ctx.log(&format!("New subject: {}", new_subject));
    let payload = serde_json::json!({ "params": radar_contact });
    ctx.log(&format!("Payload: {:?}", payload));
    publish_message(ctx, &new_subject, payload)
}

/// Function that deletes a component from a collection given a resource id
fn delete_contact(ctx: &CapabilitiesContext, rid: &String, contact_rid: &String) -> CallResult {
    let delete_subject =
        ResProtocolRequest::Delete(format!("{}.{}", rid.to_string(), RADAR_CONTACTS)).to_string();
    let payload = serde_json::json!({ "params": {"rid": contact_rid}});
    publish_message(ctx, &delete_subject, payload)
}

/// Helper function used to publish a payload on a specified subjct
fn publish_message(
    ctx: &CapabilitiesContext,
    subject: &String,
    payload: serde_json::value::Value,
) -> CallResult {
    if ctx
        .msg()
        .publish(subject, None, &serde_json::to_vec(&payload)?)
        .is_err()
    {
        Err("Error publishing message".into())
    } else {
        Ok(vec![])
    }
}

/// Function to compute all changes to a contact list needed given a resources id, current position,
/// radar receiver, all old contacts, and a map of all entity positions that are published.
/// Changes are in the form of RadarContactDeltas, either specifying to Add, Remove, or Change a contact.
fn radar_updates(
    resource_id: &String,
    current_position: &Position,
    radar_receiver: &RadarReceiver,
    old_contacts: &Vec<RadarContact>,
    all_positions: &HashMap<String, Position>,
) -> Vec<RadarContactDelta> {
    let mut deltas: Vec<RadarContactDelta> = Vec::new();
    let old_contact_rids: Vec<String> = old_contacts.iter().map(|c| c.rid.clone()).collect();
    for (k, v) in all_positions.iter() {
        if old_contact_rids.contains(k) {
            if within_radius(current_position, v, radar_receiver.radius) {
                deltas.push(RadarContactDelta::Change(RadarContact {
                    rid: k.clone().to_string(),
                    pos: *v,
                    vector_to: current_position.vector_to(v),
                }));
            } else {
                deltas.push(RadarContactDelta::Remove(k.clone().to_string()));
            }
        } else if resource_id != k && within_radius(current_position, &v, radar_receiver.radius) {
            deltas.push(RadarContactDelta::Add(RadarContact {
                rid: k.clone().to_string(),
                pos: *v,
                vector_to: current_position.vector_to(v),
            }));
        }
    }
    deltas
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
enum RadarContactDelta {
    Add(RadarContact),
    Remove(String),
    Change(RadarContact),
}

#[derive(Serialize, Deserialize, Debug)]
struct PositionValue {
    values: Position,
}

/// Receives messages on the subject `event.decs.components.{shard}.{entity}.position.change`
/// Stores entity position in-memory in the POSITIONS HashMap
/// The cache is used later to discover nearby radar_contacts
pub(crate) fn handle_entity_position_change(
    _ctx: &CapabilitiesContext,
    msg: messaging::BrokerMessage,
) -> CallResult {
    let subject: Vec<&str> = msg.subject.split('.').collect();
    let resource_id = format!("decs.components.{}.{}", subject[3], subject[4]);
    let position_value: PositionValue = serde_json::from_slice(&msg.body)?;
    let position: Position = position_value.values;
    POSITIONS
        .write()
        .unwrap()
        .insert(resource_id.to_string(), position);
    Ok(vec![])
}

fn within_radius(entity: &Position, target: &Position, radius: f64) -> bool {
    if entity.distance_to(target) <= radius {
        true
    } else {
        false
    }
}

#[cfg(test)]
mod test {
    use super::radar_updates;
    use super::within_radius;
    use super::HashMap;
    use super::Position;
    use super::RadarContact;
    use super::RadarContactDelta;
    use super::RadarReceiver;

    #[test]
    fn test_within_radius() {
        let a = Position {
            x: 1.0,
            y: 1.0,
            z: 1.0,
        };
        let b = Position {
            x: 1.0,
            y: 2.0,
            z: 1.0,
        };
        let radius = 3.0;
        assert!(within_radius(&a, &b, radius));
    }

    #[test]
    fn test_outside_radius() {
        let a = Position {
            x: 1.0,
            y: 1.0,
            z: 1.0,
        };
        let b = Position {
            x: 1.0,
            y: 200.0,
            z: 1.0,
        };
        let radius = 3.0;
        assert!(!within_radius(&a, &b, radius));
    }

    #[test]
    fn test_exact_radius() {
        let a = Position {
            x: 0.0,
            y: 20.0,
            z: 0.0,
        };
        let b = Position {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        };
        let radius = 20.0;
        assert!(within_radius(&a, &b, radius));
    }

    //TODO: fix tests below, can no longer use .contains() to check radar contacts

    #[test]
    fn test_add_contacts() {
        let rid = String::from("decs.components.the_shard.myownentity");
        let current_position = Position {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        };
        let radar_receiver = RadarReceiver { radius: 5.0 };
        let old_contacts: Vec<RadarContact> = vec![];
        let mut all_positions: HashMap<String, Position> = HashMap::new();

        let nearby_asteroid = RadarContact {
            rid: String::from("decs.components.the_shard.asteroid"),
            pos: current_position.clone(),
            vector_to: current_position.vector_to(&current_position.clone()),
        };
        let nearby_ship = RadarContact {
            rid: String::from("decs.components.the_shard.ship"),
            pos: current_position.clone(),
            vector_to: current_position.vector_to(&current_position.clone()),
        };
        let mut far_away_money = RadarContact {
            rid: String::from("decs.components.the_shard.money"),
            pos: current_position.clone(),
            vector_to: current_position.vector_to(&current_position.clone()),
        };
        far_away_money.pos.x += 500.0;
        far_away_money.vector_to = current_position.vector_to(&far_away_money.pos);

        all_positions.insert(rid.to_string(), current_position);
        all_positions.insert(nearby_asteroid.rid.clone(), nearby_asteroid.pos.clone());
        all_positions.insert(nearby_ship.rid.clone(), nearby_ship.pos.clone());
        all_positions.insert(far_away_money.rid.clone(), far_away_money.pos.clone());

        let changes = radar_updates(
            &rid,
            &current_position,
            &radar_receiver,
            &old_contacts,
            &all_positions,
        );

        assert_eq!(changes.len(), 2);
        // assert!(changes
        //     .iter()
        //     .any(|r| r == &RadarContactDelta::Add(nearby_asteroid.clone())));
        // assert!(changes.contains(&RadarContactDelta::Add(nearbyship)));
        assert!(!changes.contains(&RadarContactDelta::Add(far_away_money)));
    }

    #[test]
    fn test_remove_contacts() {
        let rid = String::from("decs.components.the_shard.myownentity");
        let current_position = Position {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        };
        let radar_receiver = RadarReceiver { radius: 5.0 };
        let mut all_positions: HashMap<String, Position> = HashMap::new();

        let mut nearby_asteroid = RadarContact {
            rid: String::from("decs.components.the_shard.asteroid"),
            pos: current_position.clone(),
            vector_to: current_position.vector_to(&current_position.clone()),
        };
        let mut nearby_ship = RadarContact {
            rid: String::from("decs.components.the_shard.ship"),
            pos: current_position.clone(),
            vector_to: current_position.vector_to(&current_position.clone()),
        };
        let mut far_away_money = RadarContact {
            rid: String::from("decs.components.the_shard.money"),
            pos: current_position.clone(),
            vector_to: current_position.vector_to(&current_position.clone()),
        };

        let old_contacts: Vec<RadarContact> = vec![nearby_asteroid.clone(), nearby_ship.clone()];

        far_away_money.pos.x += 500.0;
        far_away_money.vector_to = current_position.vector_to(&far_away_money.pos);
        nearby_asteroid.pos.x += 500.0;
        nearby_asteroid.vector_to = current_position.vector_to(&nearby_asteroid.pos);
        nearby_ship.pos.x += 500.0;
        nearby_ship.vector_to = current_position.vector_to(&nearby_ship.pos);

        all_positions.insert(rid.to_string(), current_position);
        all_positions.insert(nearby_asteroid.rid.clone(), nearby_asteroid.pos.clone());
        all_positions.insert(nearby_ship.rid.clone(), nearby_ship.pos.clone());
        all_positions.insert(far_away_money.rid.clone(), far_away_money.pos.clone());

        let changes = radar_updates(
            &rid,
            &current_position,
            &radar_receiver,
            &old_contacts,
            &all_positions,
        );

        assert_eq!(changes.len(), 2);
        assert!(changes.contains(&RadarContactDelta::Remove(nearby_asteroid.rid)));
        assert!(changes.contains(&RadarContactDelta::Remove(nearby_ship.rid)));
        assert!(!changes.contains(&RadarContactDelta::Remove(far_away_money.rid.to_string())));
        // assert!(!changes.contains(&RadarContactDelta::Add(far_away_money)));
        // assert!(!changes.contains(&RadarContactDelta::Add(rid.to_string())));
        assert!(!changes.contains(&RadarContactDelta::Remove(rid.to_string())));
    }
}
