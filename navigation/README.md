# Navigation System

The navigation system accepts the `position`, `velocity`, and `target` components and will emit an updated `target` component with the new distance and ETA for that target. If the position is within some threshold distance of the target, the navigation system will set `velocity` to zero for that entity.

