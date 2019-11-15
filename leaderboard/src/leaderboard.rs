use decs::gateway::*;
use guest::prelude::*;
use stacktrader_types as trader;
use std::collections::HashMap;
use std::sync::RwLock;
use trader::components::*;

#[derive(Serialize, Deserialize, Debug, Default, PartialEq, Clone)]
struct LeaderBoardEntry {
    pub player: String,
    pub amount: i32,
}

lazy_static! {
    static ref SCORES: RwLock<HashMap<String, HashMap<String, i32>>> = RwLock::new(HashMap::new());
}

pub(crate) fn handle_frame(ctx: &CapabilitiesContext, msg: messaging::BrokerMessage) -> CallResult {
    let frame: decs::systemmgr::EntityFrame = serde_json::from_slice(&msg.body)?;

    let wallet = get_wallet(ctx, &frame.shard, &frame.entity_id)?;
    let old_ranks = if !SCORES.read().unwrap().contains_key(&frame.shard) {
        vec![]
    } else {
        rank_shard(&SCORES.read().unwrap()[&frame.shard])
    };
    purge_leaderboard(ctx, &frame.shard, old_ranks.len())?;

    put_score(&frame.shard, &frame.entity_id, wallet.credits)?;
    let new_ranks = rank_shard(&SCORES.read().unwrap()[&frame.shard]);
    publish_leaderboard(ctx, &frame.shard, &new_ranks)?;

    Ok(vec![])
}

fn purge_leaderboard(
    ctx: &CapabilitiesContext,
    shard: &str,
    rank_count: usize,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    for _ in 0..rank_count {
        ctx.msg().publish(
            &format!("event.decs.{}.leaderboard.remove", shard),
            None,
            &serde_json::to_vec(&json!({ "idx": 0 }))?,
        )?;
    }
    Ok(())
}

fn publish_leaderboard(
    ctx: &CapabilitiesContext,
    shard: &str,
    ranks: &[LeaderBoardEntry],
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    for (i, _rank) in ranks.iter().enumerate() {
        ctx.msg().publish(
            &format!("event.decs.{}.leaderboard.add", shard),
            None,
            &serde_json::to_vec(&json!({
                "value": ResourceIdentifier { rid: format!("decs.{}.leaderboard.{}", shard, i)},
                "idx": i
            }))?,
        )?;
    }
    Ok(())
}

fn put_score(
    shard: &str,
    entity: &str,
    amount: i32,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let mut scores = SCORES.write().unwrap();
    scores.entry(shard.to_string()).or_insert_with(HashMap::new);
    scores.entry(shard.to_string()).and_modify(|e| {
        e.insert(entity.to_string(), amount);
    });

    Ok(())
}

fn get_wallet(
    ctx: &CapabilitiesContext,
    shard: &str,
    entity: &str,
) -> std::result::Result<CreditWallet, Box<dyn std::error::Error>> {
    let raw = ctx
        .kv()
        .get(&format!("decs:components:{}:{}:wallet", shard, entity))?;
    match raw {
        Some(s) => match serde_json::from_str(&s) {
            Ok(w) => Ok(w),
            Err(_) => Err("unable to fetch wallet".into()),
        },
        None => Err("no such wallet".into()),
    }
}

fn rank_shard(shardmap: &HashMap<String, i32>) -> Vec<LeaderBoardEntry> {
    let mut entries: Vec<_> = shardmap
        .iter()
        .map(|(k, v)| LeaderBoardEntry {
            player: k.clone(),
            amount: *v,
        })
        .collect();
    entries.sort_by(|a, b| b.amount.cmp(&a.amount));
    entries
}

pub(crate) fn handle_get_collection(
    ctx: &CapabilitiesContext,
    rid: &str,
    msg: &messaging::BrokerMessage,
) -> CallResult {
    let tokens: Vec<_> = rid.split('.').collect();
    let shard = tokens[1]; // decs.(shard).leaderboard

    // Return an empty collection if there are no scores in this shard yet
    let ranks = if !SCORES.read().unwrap().contains_key(shard) {
        vec![]
    } else {
        rank_shard(&SCORES.read().unwrap()[shard])
    };

    let rids: Vec<_> = ranks
        .iter()
        .enumerate()
        .map(|(i, _r)| ResourceIdentifier {
            rid: format!("decs.{}.leaderboard.{}", shard, i),
        })
        .collect();
    let result = json!({
        "result": {
            "collection": rids
        }
    });
    ctx.msg()
        .publish(&msg.reply_to, None, &serde_json::to_vec(&result)?)?;

    Ok(vec![])
}

pub(crate) fn handle_get_single(
    ctx: &CapabilitiesContext,
    rid: &str,
    msg: &messaging::BrokerMessage,
) -> CallResult {
    let tokens: Vec<_> = rid.split('.').collect();
    let idx: usize = tokens[3].parse()?; // decs.(shard).leaderboard.(idx)
    let shard = tokens[1];
    let ranks = rank_shard(&SCORES.read().unwrap()[shard]);
    let result = if idx < ranks.len() {
        json!({
            "result": {
                "model": ranks[idx]
            }
        })
    } else {
        error_not_found("no such leaderboard entry")
    };
    ctx.msg()
        .publish(&msg.reply_to, None, &serde_json::to_vec(&result)?)?;
    Ok(vec![])
}

#[cfg(test)]
mod test {
    use super::rank_shard;
    use super::LeaderBoardEntry;
    use std::collections::HashMap;

    #[test]
    fn test_simple_rank() {
        let mut ranks = HashMap::new();
        ranks.insert("bob".to_string(), 200);
        ranks.insert("al".to_string(), 300);
        ranks.insert("bobfred".to_string(), 500);

        assert_eq!(
            rank_shard(&ranks),
            vec![
                LeaderBoardEntry {
                    player: "bobfred".to_string(),
                    amount: 500
                },
                LeaderBoardEntry {
                    player: "al".to_string(),
                    amount: 300
                },
                LeaderBoardEntry {
                    player: "bob".to_string(),
                    amount: 200
                }
            ]
        );
    }
}
