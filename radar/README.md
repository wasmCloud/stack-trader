# Radar System

This system is responsible for detecting other entities within an entities `radar_receiver` `radius` distance. It will receive an entity id from a frame and the radar system will scan all entities to find ones that are in range, updating the entities `radar_contacts` to contain all entities currently in range.