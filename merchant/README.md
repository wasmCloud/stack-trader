# Merchant System

The merchant system is responsible for "buying" any items in a given entity's `sell_list` component. For each
item in this list, the merchant system will add the appropriate credit value to the entity's `wallet` component,
and will _delete_ the item from the entity's `sell_list`.

To see this in action, a UI should subscribe to the player's sell list and to the `wallet` component. This will 
let the player see their item taken out of the sell list and they'll see their new credits arrive. It is the responsibility of the front-end to allow the player to move items from their `inventory` list and into the `sell_list` component (by issuing the appropriate `delete` and `new` operations to a component manager).


