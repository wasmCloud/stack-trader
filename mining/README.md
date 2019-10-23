# Mining System

The mining system is responsible for allowing players to extract resources from asteroids. In the game UI, the player will begin exctracting resources from some suitable object like an asteroid. Some time later, resources will be pulled from the object and placed into the player's inventory.

*Implicit* here is the notion that whatever is responsible for populating the universe with mine-able objects will need to not only create the object (entity + `position` and `radar_transponder`) but will also need to create the `mining_resource` component.

The following is what takes place from the perspective of dECS Cloud:
* An entity has a `mining_resource` (e.g. `decs.components.the_void.asteroid99.mining_resource`)
* A player's actions will result in the creation of an `extractor` component:
```json
{    
    "target": "decs.components.the_void.asteroid99.mining_resource",
    "remaining_ms": 100, 
}
```
* The `mining` system will receive frames containing the `extractor` component. During each frame, the system will subtract from the remaining time and, if completed, will produce a new component to place in the source entity's (player's) inventory.
* The movement of resource to inventory will delete the extractor (halting the mining operation), and place the appropriate information in the player's inventory.

## Mining Resource Component
Mining resources can be attached to any entity that can be mined. The resource describes the "reward" for mining:

```json
{
    "stack_type": "[tasty|spendy|critical]",
    "qty": 11
}
```

## Inventory Item
For now the only thing we will be holding in an inventory is the result of mining:

```json
{
    "stack_type": "[tasty|spendy|critical]",
    "qty": 99
}
```

## Other Rules
The game UI must enforce that an entity with an extractor attached must not be allowed to be mined by any other player. The object should be considered "locked" to a player until that extractor is done.

As with everything else in this game, the extraction can finish while the player is disconnected.