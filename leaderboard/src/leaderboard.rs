use decs::gateway::*;
use guest::prelude::*;
use stacktrader_types as trader;
use std::collections::HashMap;
use std::sync::RwLock;
use trader::components::*;

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
struct LeaderBoardEntry {
    pub player: String,
    pub amount: i32,
}

impl Default for LeaderBoardEntry {
    fn default() -> Self {
        LeaderBoardEntry {
            player: "Nobody".to_string(),
            amount: 0,
        }
    }
}

lazy_static! {
    static ref SCORES: RwLock<HashMap<String, HashMap<String, i32>>> = RwLock::new(HashMap::new());
}

pub(crate) fn handle_frame(ctx: &CapabilitiesContext, msg: messaging::BrokerMessage) -> CallResult {
    let frame: decs::systemmgr::EntityFrame = serde_json::from_slice(&msg.body)?;

    let wallet = get_wallet(ctx, &frame.shard, &frame.entity_id)?;
    let old_ranks = rank_shard(SCORES.read().unwrap().get(&frame.shard));
    put_score(&frame.shard, &frame.entity_id, wallet.credits)?;
    let new_ranks = rank_shard(SCORES.read().unwrap().get(&frame.shard));
    publish_changes(ctx, &frame.shard, &old_ranks, &new_ranks)?;

    Ok(vec![])
}

fn publish_changes(
    ctx: &CapabilitiesContext,
    shard: &str,
    old: &[LeaderBoardEntry],
    new: &[LeaderBoardEntry],
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    for i in 0..old.len() {
        if old[i] != new[i] {
            ctx.msg().publish(
                &format!("event.decs.{}.leaderboard.{}.change", shard, i),
                None,
                &serde_json::to_vec(&json!({
                    "values": new[i]
                }))?,
            )?;
        }
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

// Rank all players according to their score, then return the top 10
// if there are less than 10 players with scores, fill the remaining slots
// with "Nobody"
fn rank_shard(shardmap: Option<&HashMap<String, i32>>) -> Vec<LeaderBoardEntry> {
    match shardmap {
        Some(shardmap) => {
            let mut entries: Vec<_> = shardmap
                .iter()
                .map(|(k, v)| LeaderBoardEntry {
                    player: k.clone(),
                    amount: *v,
                })
                .collect();
            entries.sort_by(|a, b| b.amount.cmp(&a.amount));

            let mut leaderboard: Vec<LeaderBoardEntry> = entries.into_iter().take(10).collect();
            for _i in 0..10 - leaderboard.len() {
                leaderboard.push(LeaderBoardEntry::default())
            }
            leaderboard
        }
        None => std::iter::repeat(LeaderBoardEntry::default())
            .take(10)
            .collect(),
    }
}

pub(crate) fn handle_get_collection(
    ctx: &CapabilitiesContext,
    rid: &str,
    msg: &messaging::BrokerMessage,
) -> CallResult {
    let tokens: Vec<_> = rid.split('.').collect();
    let shard = tokens[1]; // decs.(shard).leaderboard

    let ranks = rank_shard(SCORES.read().unwrap().get(shard));

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
    let ranks = rank_shard(SCORES.read().unwrap().get(shard));
    let result = 
        json!({
            "result": {
                "model": ranks[idx]
            }
        });    
    ctx.msg()
        .publish(&msg.reply_to, None, &serde_json::to_vec(&result)?)?;
    Ok(vec![])
}
