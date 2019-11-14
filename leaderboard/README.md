# Leaderboard System

This system is responsible for capturing wallet changes and keeping an internal cache of the top 10 players within each shard based on credits on hand. It exposes this leaderboard data as a RES protocol service on the resource `decs.(shard).leaderboard` (collection). Each leaderboard item is exposed as `decs.(shard).leaderboard.(idx)` with the payload of:

```
{
    "player": "(player ID)",
    "amount": (credits)
}
```

For the demo, query `decs.mainworld.leaderboard`